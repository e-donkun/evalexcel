

//セル評価点設定
function setting_evalparm(obj_model,obj_book,sheetname,cellId){
	console.log("function setting_evalparm()",obj_model,obj_book,sheetname,cellId);
	var html = "";
	return html;
}


function show_sheet(obj_book,_criteria,_label){
	var obj_criteria = _criteria || null;
	var label = _label || null;
  
  
	//console.log("function show_sheet()",obj_book,obj_criteria);
	
	var html = "";
    

	//var obj_book = JSON.parse(json_data);

	//var cnt_cheet = 0;
	for(var sheetname in obj_book){
		if(obj_book.hasOwnProperty(sheetname)){
			//cnt_cheet++;
			var obj_sheet = obj_book[sheetname];
			
			html +=  "<div class='exceltable' data-sheetname='"+sheetname+"'>";
			//html +=  "    <div id='"+cnt_cheet+"' class='sheettab'>"+sheetname+"</div>\n";
			html +=  "<div class='sheettab'>"+sheetname+"</div>";
			html +=  "<table class='bordered'>";
			
			var MaxRow = getMaxRow(obj_sheet)+1;
			var MaxCol = getMaxCol(obj_sheet)+1;
			//console.log(sheetname,MaxRow,MaxCol);
			
			html +=  "<tr><th></th>";
			for(var colno=1;colno<=MaxCol;colno++){
				colId = ColNameFromColNo(colno);
				html +=  "<th>"+colId+"</th>";
			}
			html +=  "</tr>";
			
			for(rowNo=1;rowNo<=MaxRow;rowNo++){
				html +=  "<tr><th>"+rowNo+"</th>";
				for(var colno=1;colno<=MaxCol;colno++){
					colId = ColNameFromColNo(colno);
					//css_id = "S"+cnt_cheet+"-"+str_pad(colId,3,"_")+str_pad(rowNo,7,"0");
					if(isset(obj_sheet[colId+rowNo])){
						if(isset(obj_sheet[colId+rowNo]['f'])){
							cell = obj_sheet[colId+rowNo]['f'];
						} else {
							cell = obj_sheet[colId+rowNo]['v'];
						}
					} else {
						cell = "";
					}
					
					cell = cell.replace( /_xlfn./g , "" ) ;
					//評価
					var class_eval = "";
					var label_html = "";
					if(isset(obj_criteria) && isset(obj_criteria[sheetname]) && isset(obj_criteria[sheetname][colId+""+rowNo])){
						var evaldata = obj_criteria[sheetname][colId+""+rowNo];
						if(evaldata.enable == true){
							//未入力チェック
							if( evaldata.isset == true ){
								if(cell.length > 0){
									class_eval += " isset_ok";
								} else {
									class_eval += " isset_ng";
									if(isset(label) && label.hasOwnProperty("label_isset_ng")){ label_html = label["label_isset_ng"]; }
								}
							}
							
							if( evaldata.isset != true && evaldata.eval.length > 0){
								var exists_return = false;
								if(isset(obj_sheet[colId+rowNo])){
									for(var i=0;i<evaldata.eval.length;i++){
										if(obj_sheet[colId+rowNo].hasOwnProperty('f') && evaldata.eval[i].f !== null && 
                                                          evaldata.eval[i].f == obj_sheet[colId+rowNo]['f'] && exists_return != true){
											if(evaldata.eval[i].point!=null && evaldata.eval[i].point >= 0){
												class_eval += " eval_ok eval_f point_"+evaldata.eval[i].point;
												if(isset(label) && label.hasOwnProperty("label_point_"+evaldata.eval[i].point)){ label_html = label["label_point_"+evaldata.eval[i].point]; }
												exists_return = true;
											}
										}　else if(obj_sheet[colId+rowNo].hasOwnProperty('v') && evaldata.eval[i].v == obj_sheet[colId+rowNo]['v'] && exists_return != true){
											if(evaldata.eval[i].point!=null && evaldata.eval[i].point>0){
												class_eval += " eval_ok eval_v point_"+evaldata.eval[i].point;
												
												if(isset(label) && label.hasOwnProperty("label_point_"+evaldata.eval[i].point)){ label_html = label["label_point_"+evaldata.eval[i].point]; }
												exists_return = true;
											}
										}
									}
								} else {
									class_eval += " isset_ng";
									if(isset(label) && label.hasOwnProperty("label_isset_ng")){ label_html = label["label_isset_ng"]; }
									exists_return = true;
								}
								if(exists_return!=true){
									class_eval += " eval_ng"; 
									if(isset(label) && label.hasOwnProperty("label_eval_ng")){ label_html = label["label_eval_ng"]; }
								}
							}
						}
					}
					
					//html +=  "            <td id='"+css_id+"' class='cell "+class_eval+"' data-cellId='"+colId+""+rowNo+"'><pre>"+cell+"</pre></td>\n";
					if(cell.length > 0){
						cell = "<pre>" + cell + "</pre>";
					}
					html +=  "<td class='cell "+class_eval+"' data-cellId='"+colId+""+rowNo+"'>"+label_html+cell+"</td>";
				}
				html +=  "</tr>";
			}
			html +=  "</table>";
			html +=  "</div>";
		
		}
	}
	return html;
	
	function getMaxRow(obj_sheet){
		var maxrowno = 1;
		for(var cell in obj_sheet){
			if(obj_sheet.hasOwnProperty(cell)){
				var rowno = parseInt(cell.match(/\d+/)[0]);
				if(maxrowno < rowno){
					maxrowno = rowno;
				}
			}
		}
		return maxrowno;
	}
	function getMaxCol(obj_sheet){
		var maxcolno = 1;
		for(var cell in obj_sheet){
			if(obj_sheet.hasOwnProperty(cell)){
				var colno = ColNoFromColName(cell.match(/[A-Z]{1,3}/)[0]);
				if(maxcolno < colno){
					maxcolno = colno;
				}
			}
		}
		return maxcolno;
	}
}

function score_sheet(obj_book,_eval){
    var obj_criteria = _eval || null;
    
    var cnt_isset = 0;
    var cnt_isset_ng = 0;
    var cnt_eval = 0;
    var cnt_wrong = 0;
    var total_point = 0;
    
    for(var sheetname in obj_criteria){
        if(obj_criteria.hasOwnProperty(sheetname)){
            for(var cellId in obj_criteria[sheetname]){
                if(obj_criteria[sheetname].hasOwnProperty(cellId)){
                    var eval_cell = obj_criteria[sheetname][cellId];
                    if(eval_cell.enable == true){
                        cnt_isset++;
                        if(sheetname in obj_book && cellId in obj_book[sheetname] && ( isset(obj_book[sheetname][cellId]) && (isset(obj_book[sheetname][cellId].f) || isset(obj_book[sheetname][cellId].v)) ) ){
                            var cell = obj_book[sheetname][cellId];
                            if(eval_cell.eval.length>0){
                                cnt_eval++;
                                var isset_eval = false;
                                for(var i=0;i<eval_cell.eval.length;i++){
                                    var evaldata = eval_cell.eval[i];
                                    if(evaldata.f !== null && evaldata.f == cell.f && !isset_eval){
                                        isset_eval=true;
                                        if(evaldata.point>0){
                                            total_point += evaldata.point;  //○か△のとき
                                        } else if(evaldata.point == 0){
                                        } else {
                                        }
                                    } else if(evaldata.f == null && evaldata.v !== null && evaldata.v == cell.v && !isset_eval){
                                        isset_eval=true;
                                        if(evaldata.point>0){
                                            total_point += evaldata.point;  //○か△のとき
                                        } else if(evaldata.point == 0){
                                        } else {
                                        }
                                    }
                                }
                            }
                        } else {
                            if(eval_cell.eval.length>0){
                                cnt_eval++;
                            }
                            cnt_isset_ng++;
                        }
                        //console.log(total_point,cnt_isset,cnt_isset_ng,cnt_eval,cnt_wrong);
                    }
                }
            }
        }
    }
    // var html = "";
    // html +=  "<strong>" + parseInt(((total_point-cnt_isset_ng)/(cnt_eval*10))*100) + "点</strong>";
    // html += "( 内訳：　【評価（○:10点,△:5点）："+total_point+"点】－【減点：未入力" +cnt_isset_ng+"箇所×1点】＝"+(total_point-cnt_isset_ng)+"／" + (cnt_eval*10) + ")" ;
    var obj_ret = { point:total_point, count_isset: cnt_isset, count_eval: cnt_eval, count_isset_ng: cnt_isset_ng, score: parseInt(((total_point-cnt_isset_ng)/(cnt_eval*10))*100)};
    return obj_ret;
}

function SetStyleTable(obj){
	$("[data-sheetname] [data-cellid]").css("background-color","");
	for(var sheetname in obj){
		if(obj.hasOwnProperty(sheetname)){
			for(var cellId in obj[sheetname]){
				if(obj[sheetname].hasOwnProperty(cellId)){
					var obj_eval_cell = obj[sheetname][cellId];
					//console.log(obj_eval_cell);
					
					if(obj_eval_cell.enable == true){
						if(obj_eval_cell.isset == true){
							$('[data-sheetname="'+sheetname+'"] [data-cellid="'+cellId+'"]').css("background-color","orange");
						} else {
							if(obj_eval_cell.eval.length > 0){
								$('[data-sheetname="'+sheetname+'"] [data-cellid="'+cellId+'"]').css("background-color","red");
							}
						}
					}
					
				}
			}
		}
	}
}

function ColNoFromColName(colname){
	var d=colname.length-1;
	var a=1;
	if(d==1) a=27;
	if(d==2) a=703;
	for(var i=0; i<=d ; i++ ){
		a+=(colname.charCodeAt(i)-65)*(Math.pow(26,d-i));
	}
	return a;
}

function ColNameFromColNo(colno){
	var n=0;
	var id="";
	if(colno>=703){
		//３桁
		n=colno-703;
		id = String.fromCharCode(parseInt(n/676)+65,parseInt((n%676)/26)+65,parseInt(n%26)+65);
	}else if(colno>=27){
		//２桁
		n=colno-27;
		id = String.fromCharCode(parseInt(n/26)+65,parseInt(n%26)+65);
	}else{
		//１桁
		n=colno-1;
		id = String.fromCharCode(parseInt(n%26)+65);
	}
	return id;
}

var str_pad = function(str,len,pad_str){
	var pad = "";
	str = str.toString();
	for(var i=0;i<len;i++){
		pad+= "" + pad_str;
	}
	return (pad+""+str).substring(str.length, str.length + pad.length);
};

var isset = function(data){
	if(data === "" || data === undefined || data === null){
		return false;
	}else{
		return true;
	}
};

var is_null = function(data){
	if(data === null){
		return true;
	}else{
		return false;
	}
};

function obj_array_sort(data,key,order){
	//デフォは降順(DESC)
	var num_a = -1;
	var num_b = 1;

	if(order === 'asc'){//指定があれば昇順(ASC)
	  num_a = 1;
	  num_b = -1;
	}

	data = data.sort(function(a, b){
	  var x = a[key];
	  var y = b[key];
	  if (x > y) return num_a;
	  if (x < y) return num_b;
	  return 0;
	});

	return data; // ソート後の配列を返す
}


function get_obj_by_key_value(dataAry, key, value) {
	var result = $.grep(dataAry, function (e) {
		//x return e.key == value;                       // こういう書き方は出来ないようだ。
		return e[key] == value;
	});
	return result;
}

function get_index_by_key_value(dataAry, key, value) {
	var result = $.grep(dataAry, function (e) {
		//x return e.key == value;                       // こういう書き方は出来ないようだ。
		return e[key] == value;
	});
	return result;
}

function EvalCriteria(){
	this.enable = true;
	this.isset = true;
	this.eval = [];
}

function basename(fullpath) {
	var path = fullpath.split('\\');
	return path.pop();
}

function array_search(needle,haystack){
    var ret = false;
    if(!Array.isArray(haystack)){
        return ret;
    }
    for (var i = 0; i < haystack.length; i ++) {
        if(haystack[i] === needle){
            return ret;
        }
    }
    return ret;
}

function objectSort(object) {
    //戻り値用新オブジェクト生成
    var sorted = {};
    //キーだけ格納し，ソートするための配列生成
    var array = [];
    //for in文を使用してオブジェクトのキーだけ配列に格納
    for (key in object) {
        //指定された名前のプロパティがオブジェクトにあるかどうかチェック
        if (object.hasOwnProperty(key)) {
            //if条件がtrueならば，配列の最後にキーを追加する
            array.push(key);
        }
    }
    //配列のソート
    array.sort(); 
    //配列の逆ソート
    //array.reverse();
 
    //キーが入った配列の長さ分だけfor文を実行
    for (var i = 0; i < array.length; i++) {
        /*戻り値用のオブジェクトに
        新オブジェクト[配列内のキー] ＝ 引数のオブジェクト[配列内のキー]を入れる．
        配列はソート済みなので，ソートされたオブジェクトが出来上がる*/
        sorted[array[i]] = object[array[i]];
    }
    //戻り値にソート済みのオブジェクトを指定
    return sorted;
}

