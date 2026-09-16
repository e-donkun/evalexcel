<?php
ini_set("display_errors", 0);
ini_set("display_startup_errors", 0);
ini_set('max_file_uploads ', '500');
error_reporting(E_ALL);

register_shutdown_function(
	function () {
		$e = error_get_last();
		if (
			$e['type'] == E_ERROR ||
			$e['type'] == E_PARSE ||
			$e['type'] == E_CORE_ERROR ||
			$e['type'] == E_COMPILE_ERROR ||
			$e['type'] == E_USER_ERROR
		) {
			echo "Error!\n";
			echo "致命的なエラーが発生しました。\n";
			echo "Error type:\t {$e['type']}\n";
			echo "Error message:\t {$e['message']}\n";
			echo "Error file:\t {$e['file']}\n";
			echo "Error line:\t {$e['line']}\n";
		}
	}
);
// エラー時に例外をスローするようにコールバック関数を登録
set_error_handler(function ($errno, $errstr, $errfile, $errline) {
	throw new ErrorException($errstr, $errno, 0, $errfile, $errline);
});

try {
	//xlsファイルがアップロードされたら、json形式で返す。
	include_once 'PHPExcelReader.php';
	$ret = array();


	foreach ($_FILES as $name => $data) {
		if (is_uploaded_file($data["tmp_name"])) {
			$tmpfilepath = $data["tmp_name"];
			$xlsx = new PHPExcelReader($tmpfilepath);
			if ($name == 'model') {
				//モデルファイルの時だけ１ファイルのみにする
				$ret = $xlsx->getAllSheets();
				break;
			} else {
				$ret[$data["name"]] = $xlsx->getAllSheets();
			}
		}
	}


	echo $json_sheet = json_encode($ret);
} catch (Exception $e) {
	echo "Error!\n";
	echo "例外エラーが発生しました\n";
	echo $e->getLine() . "\n";
	echo $e->getFile() . "\n";
	echo $e->getMessage() . "\n";
}
