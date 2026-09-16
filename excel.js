/*
 * excel.js
 *
 * xlsx ファイルをブラウザ上だけで読み込み、PHPExcelReader.php / xlsx2json.php が
 * 返していたものと同じ構造の JSON ( { シート名: { セル番地: {v, f} } } ) に変換する。
 * サーバサイド(PHP)を廃止し、xlsx→JSON変換をすべてクライアントサイドで完結させるための実装。
 *
 * 依存: js/utf.js (utf8to16), js/inflate.js (zip_inflate)
 */
var ExcelReader = (function () {
	'use strict';

	var SIG_LOCAL_FILE  = 0x04034b50;
	var SIG_CENTRAL_DIR = 0x02014b50;
	var SIG_EOCD        = 0x06054b50;

	function readUint16(view, offset) { return view.getUint16(offset, true); }
	function readUint32(view, offset) { return view.getUint32(offset, true); }

	// Uint8Arrayの一部分を「1文字=1バイト」のバイナリ文字列に変換する
	// (zip_inflate/utf8to16がこの形式の文字列を前提としているため)
	function bytesToBinaryString(bytes, start, length) {
		var CHUNK = 0x8000;
		var parts = [];
		var end = start + length;
		for (var i = start; i < end; i += CHUNK) {
			parts.push(String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CHUNK, end))));
		}
		return parts.join('');
	}

	function findEndOfCentralDirectory(view, bytes) {
		// EOCDレコードは最小22バイト、末尾コメントは最大65535バイト
		var minPos = Math.max(0, bytes.length - 22 - 65535);
		for (var pos = bytes.length - 22; pos >= minPos; pos--) {
			if (readUint32(view, pos) === SIG_EOCD) {
				return pos;
			}
		}
		throw new Error('zipの終端レコードが見つかりません。xlsx形式のファイルではない可能性があります。');
	}

	// 最低限のzip読み込み(xlsx=zipなので、中のファイルを名前で取り出せれば十分)
	function openZip(arrayBuffer) {
		var bytes = new Uint8Array(arrayBuffer);
		var view = new DataView(arrayBuffer);
		var eocdPos = findEndOfCentralDirectory(view, bytes);

		var entryCount = readUint16(view, eocdPos + 10);
		var centralDirOffset = readUint32(view, eocdPos + 16);

		var entries = {};
		var pos = centralDirOffset;
		for (var i = 0; i < entryCount; i++) {
			if (readUint32(view, pos) !== SIG_CENTRAL_DIR) {
				throw new Error('zipのCentral Directoryが不正です。ファイルが壊れている可能性があります。');
			}
			var method     = readUint16(view, pos + 10);
			var compSize   = readUint32(view, pos + 20);
			var nameLen    = readUint16(view, pos + 28);
			var extraLen   = readUint16(view, pos + 30);
			var commentLen = readUint16(view, pos + 32);
			var localOffset = readUint32(view, pos + 42);
			var name = bytesToBinaryString(bytes, pos + 46, nameLen);

			entries[name] = { method: method, compSize: compSize, localOffset: localOffset };
			pos += 46 + nameLen + extraLen + commentLen;
		}

		return {
			hasEntry: function (name) {
				return entries.hasOwnProperty(name);
			},
			readText: function (name) {
				var entry = entries[name];
				if (!entry) { return null; }

				var lp = entry.localOffset;
				if (readUint32(view, lp) !== SIG_LOCAL_FILE) {
					throw new Error('zipのLocal File Headerが不正です。(' + name + ')');
				}
				var lNameLen  = readUint16(view, lp + 26);
				var lExtraLen = readUint16(view, lp + 28);
				var dataStart = lp + 30 + lNameLen + lExtraLen;

				var raw = bytesToBinaryString(bytes, dataStart, entry.compSize);
				var inflated;
				if (entry.method === 0) {
					inflated = raw;
				} else if (entry.method === 8) {
					inflated = zip_inflate(raw);
				} else {
					throw new Error('未対応の圧縮方式です。(method=' + entry.method + ')');
				}
				return utf8to16(inflated);
			}
		};
	}

	function parseXml(text) {
		var doc = new DOMParser().parseFromString(text, 'application/xml');
		if (doc.getElementsByTagName('parsererror').length > 0) {
			throw new Error('xlsx内のXML解析に失敗しました。');
		}
		return doc;
	}

	function firstElement(list) {
		return list.length > 0 ? list[0] : null;
	}

	// ---- セル番地(例:"AB12") <-> 列番号 の変換 ----

	function columnIndexFromString(colStr) {
		var ret = 0;
		for (var i = 0; i < colStr.length; i++) {
			ret = ret * 26 + (colStr.charCodeAt(i) - 64);
		}
		return ret;
	}

	function stringFromColumnIndex(col) {
		var ret = '';
		while (col > 0) {
			var rem = (col - 1) % 26;
			ret = String.fromCharCode(65 + rem) + ret;
			col = Math.floor((col - 1) / 26);
		}
		return ret;
	}

	var CELL_REF_RE   = /^(\$?)([A-Z]{1,3})(\$?)([0-9]+)$/;
	var CELL_REF_G_RE = /\$?[A-Z]{1,3}\$?[0-9]+/g;

	// 共有数式(shared formula)のマスター数式(formula/src)を、別セル(dst)用の数式に変換する
	function relativeReference(formula, src, dst) {
		var mSrc = CELL_REF_RE.exec(src);
		var mDst = CELL_REF_RE.exec(dst);
		if (!mSrc || !mDst) { return formula; }

		var offsetCol = columnIndexFromString(mDst[2]) - columnIndexFromString(mSrc[2]);
		var offsetRow = parseInt(mDst[4], 10) - parseInt(mSrc[4], 10);

		return formula.replace(CELL_REF_G_RE, function (cellRef) {
			var m = CELL_REF_RE.exec(cellRef);
			if (!m) { return cellRef; }
			if (m[1] === '$' && m[3] === '$') { return cellRef; } // 絶対参照はそのまま

			var colNo = columnIndexFromString(m[2]);
			var rowNo = parseInt(m[4], 10);
			if (m[1] !== '$') { colNo += offsetCol; }
			if (m[3] !== '$') { rowNo += offsetRow; }
			return m[1] + stringFromColumnIndex(colNo) + m[3] + rowNo;
		});
	}

	// ---- xlsx(ワークブック)の解析 ----

	function XlsxWorkbook(arrayBuffer) {
		this.zip = openZip(arrayBuffer);
		if (!this.zip.hasEntry('xl/workbook.xml')) {
			throw new Error('xlsx形式のファイルではありません。');
		}
		this.sheetList = this._loadSheetList();
		this.sharedStrings = this._loadSharedStrings();
		this._sheetXmlCache = {};
	}

	XlsxWorkbook.prototype._loadWorkbookRels = function () {
		var relMap = {};
		var xml = this.zip.readText('xl/_rels/workbook.xml.rels');
		if (xml === null) { return relMap; }

		var rels = parseXml(xml).getElementsByTagName('Relationship');
		for (var i = 0; i < rels.length; i++) {
			var id = rels[i].getAttribute('Id');
			var target = rels[i].getAttribute('Target');
			if (id && target) {
				relMap[id] = target.replace(/^\.?\//, '');
			}
		}
		return relMap;
	};

	XlsxWorkbook.prototype._loadSheetList = function () {
		var doc = parseXml(this.zip.readText('xl/workbook.xml'));
		var relMap = this._loadWorkbookRels();
		var sheetNodes = doc.getElementsByTagName('sheet');

		var list = [];
		for (var i = 0; i < sheetNodes.length; i++) {
			var node = sheetNodes[i];
			var name = node.getAttribute('name');
			var rId = node.getAttribute('r:id');
			var target = (rId && relMap[rId]) ? relMap[rId] : ('worksheets/sheet' + (i + 1) + '.xml');
			list.push({ name: name, path: 'xl/' + target });
		}
		return list;
	};

	XlsxWorkbook.prototype._loadSharedStrings = function () {
		var strings = [];
		var xml = this.zip.readText('xl/sharedStrings.xml');
		if (xml === null) { return strings; }

		var siNodes = parseXml(xml).getElementsByTagName('si');
		for (var i = 0; i < siNodes.length; i++) {
			var tNode = firstElement(siNodes[i].getElementsByTagName('t'));
			if (tNode) {
				strings.push(tNode.textContent);
				continue;
			}
			// リッチテキスト(複数run)の場合は各<r><t>を連結する
			var runs = siNodes[i].getElementsByTagName('r');
			var text = '';
			for (var j = 0; j < runs.length; j++) {
				var rt = firstElement(runs[j].getElementsByTagName('t'));
				if (rt) { text += rt.textContent; }
			}
			strings.push(text);
		}
		return strings;
	};

	XlsxWorkbook.prototype.listWorksheetNames = function () {
		return this.sheetList.map(function (s) { return s.name; });
	};

	XlsxWorkbook.prototype.getSheet = function (sheetNo) {
		var self = this;
		var sheetInfo = this.sheetList[sheetNo];
		if (!sheetInfo) { return {}; }

		if (!this._sheetXmlCache.hasOwnProperty(sheetInfo.path)) {
			var xml = this.zip.readText(sheetInfo.path);
			this._sheetXmlCache[sheetInfo.path] = xml !== null ? parseXml(xml) : null;
		}
		var doc = this._sheetXmlCache[sheetInfo.path];
		if (!doc) { return {}; }

		var cellNodes = doc.getElementsByTagName('c');

		// 1周目: 共有数式(shared formula)のマスター数式を集める(si -> {f, r})
		var sharedFormulas = {};
		var i;
		for (i = 0; i < cellNodes.length; i++) {
			var fNode0 = firstElement(cellNodes[i].getElementsByTagName('f'));
			if (!fNode0) { continue; }
			var fText0 = fNode0.textContent;
			var si0 = fNode0.getAttribute('si');
			if (fText0 !== '' && si0 !== null && si0 !== '') {
				sharedFormulas[si0] = { f: fText0, r: cellNodes[i].getAttribute('r') };
			}
		}

		// 2周目: 各セルの値・数式を組み立てる
		var sheetData = {};
		for (i = 0; i < cellNodes.length; i++) {
			var cellNode = cellNodes[i];
			var cellRef = cellNode.getAttribute('r');
			var cellType = cellNode.getAttribute('t');

			var vNode = firstElement(cellNode.getElementsByTagName('v'));
			var cellValue = vNode ? vNode.textContent : null;
			if (cellType === 's' && cellValue !== null) {
				cellValue = self.sharedStrings[parseInt(cellValue, 10)];
				if (cellValue === undefined) { cellValue = null; }
			}

			var cellFormula = null;
			var fNode = firstElement(cellNode.getElementsByTagName('f'));
			if (fNode) {
				var si = fNode.getAttribute('si');
				if (si !== null && si !== '' && sharedFormulas.hasOwnProperty(si)) {
					cellFormula = '=' + relativeReference(sharedFormulas[si].f, sharedFormulas[si].r, cellRef);
				} else {
					cellFormula = '=' + fNode.textContent;
				}
			}

			if (cellValue !== null) {
				sheetData[cellRef] = { v: cellValue, f: cellFormula };
			}
		}
		return sheetData;
	};

	XlsxWorkbook.prototype.getSheetByName = function (sheetName) {
		var names = this.listWorksheetNames();
		return this.getSheet(names.indexOf(sheetName));
	};

	XlsxWorkbook.prototype.getAllSheets = function () {
		var result = {};
		for (var i = 0; i < this.sheetList.length; i++) {
			result[this.sheetList[i].name] = this.getSheet(i);
		}
		return result;
	};

	// ---- File(Blob) -> ArrayBuffer ----

	function fileToArrayBuffer(file) {
		if (typeof file.arrayBuffer === 'function') {
			return file.arrayBuffer();
		}
		return new Promise(function (resolve, reject) {
			var reader = new FileReader();
			reader.onload = function (e) { resolve(e.target.result); };
			reader.onerror = function () { reject(reader.error); };
			reader.readAsArrayBuffer(file);
		});
	}

	// 次のイベントループまで処理を譲る(大量ファイル処理時にブラウザを固まらせないため)
	function yieldToBrowser() {
		return new Promise(function (resolve) { setTimeout(resolve, 0); });
	}

	// ---- 公開API(旧xlsx2json.phpの代替) ----

	// 1ファイルを読み込み、{シート名: {セル番地: {v,f}}} を返す
	function readXlsxFile(file) {
		return fileToArrayBuffer(file).then(function (buffer) {
			var workbook = new XlsxWorkbook(buffer);
			return workbook.getAllSheets();
		});
	}

	// 複数ファイルを順に読み込み、{ファイル名: {シート名: {セル番地: {v,f}}}} を返す。
	// いずれか1ファイルでも読み込みに失敗した場合はエラーとする(旧xlsx2json.phpと同じ挙動)。
	function readXlsxFiles(fileList) {
		var files = Array.prototype.slice.call(fileList);
		var result = {};

		function next(index) {
			if (index >= files.length) {
				return Promise.resolve(result);
			}
			var file = files[index];
			return readXlsxFile(file).catch(function (err) {
				var message = err && err.message ? err.message : String(err);
				throw new Error('[' + file.name + '] ' + message);
			}).then(function (sheets) {
				result[file.name] = sheets;
				return yieldToBrowser();
			}).then(function () {
				return next(index + 1);
			});
		}

		return next(0);
	}

	return {
		readXlsxFile: readXlsxFile,
		readXlsxFiles: readXlsxFiles,
		XlsxWorkbook: XlsxWorkbook
	};
})();
