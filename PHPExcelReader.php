<?php
class PHPExcelReader
{
	
	private $filename = '';
	private $workbook = array();
	private $sheets = array();
	private $sharedStrings = array();
	private $sharedFormula = array();
		
	public function __construct($fn)
	{
		$this->filename = $fn;
		$this->load($this->filename);
	}
	
	private function load($filename)
	{
		if (!file_exists($filename) || !is_readable($filename)) {
			die ("Could not open " . $filename . "! File does not exist.");
		}
		$zip = new ZipArchive;
		if ($zip->open($filename) == TRUE) {
			for ($i = 0; $i < $zip->numFiles; $i++) {
				$entry_name = $zip->getNameIndex($i);
				if( $entry_name === 'xl/workbook.xml'){
					$xml_string = $zip->getFromIndex($i);
					$xml = simplexml_load_string($xml_string);
					$this->workbook = $xml->sheets;
				} else if( preg_match( '|^xl/worksheets/sheet(\d*)\.xml$|',$entry_name,$match) ){
					$xml_string = $zip->getFromIndex($i);
					$xml = simplexml_load_string($xml_string);
					$this->sheets[$match[1]-1] = $xml->sheetData;
					$this->sharedFormula[$match[1]-1] = $this->parse_Formula($xml->sheetData);
				} else if( $entry_name === 'xl/sharedStrings.xml'){ 
					$xml_string = $zip->getFromIndex($i);
					$xml = simplexml_load_string($xml_string);
					$this->sharedStrings = $this->parse_String($xml);
				}
			}
			$zip->close();
		} else {
			die ("Could not open " . $filename . "!");
		}

		
	}
	
	private function parse_Formula($xml)
	{
		$array = null;
		foreach($xml->children() as $cols){
			foreach($cols->children() as $cell){
				$f = (string)$cell->f;
				if($f!==""){
					$r = (string)$cell->attributes()->r;
					$t = (string)$cell->f->attributes()->t;
					$ref = (string)$cell->f->attributes()->ref;
					$si = (string)$cell->f->attributes()->si;
					if($t='shared' && $si!==""){
						$array[$si]['f']=$f;
						$array[$si]['r']=$r;
					}
				}
			}
		}
		return $array;
	}
	
	private function parse_String($xml)
	{
		$array = null;
		foreach ($xml->si as $si) {
			$array[] = (string)$si->t;
		}
		return $array;
	}
	
	public function getSheet($SheetNo,$type="")
	{
		$sheetdata = array();
		$sharedFormula = $this->sharedFormula[$SheetNo];

		foreach($this->sheets[$SheetNo]->children() as $cols){
			foreach($cols->children() as $cell){
				$cell_r = (string)$cell->attributes()->r;
				$cell_v = null;
				$cell_t = null;
				$cell_f = null;
				
				if(isset($cell['t']))
					$cell_t = (string)$cell->attributes()->t;

				if(isset($cell->v)){
					$cell_v = (string)$cell->v;
					if($cell_t == 's' && !is_null($cell_v)){
						$cell_v = $this->sharedStrings[$cell_v];
					}
				}
				if(isset($cell->f)){
					$cell_f = (string)$cell->f;
					$si = (string)$cell->f->attributes()->si;
					if($si!==""){
						$cell_f = $this->relativeReference($sharedFormula[$si]['f'],$sharedFormula[$si]['r'],$cell_r);
					}
					$cell_f = "=".$cell_f;
				}
				if($cell_v!==null){
					$sheetdata[$cell_r]=new PHPExcelReader_Cell($cell_v,$cell_f);
				}
			}
		}

		// $MaxRow = $this->getMaxRow($SheetNo);
		// $MaxCol = $this->getMaxCol($SheetNo);;
		// for($row=1;$row<=$MaxRow;$row++){
			// for($col=1;$col<=$MaxCol;$col++){
				// if(isset($sheetdata[self::stringFromColumnIndex($col).$row])){
					// $sheetdata[$row][$col]=$sheetdata[self::stringFromColumnIndex($col).$row];
				// } else {
					// $sheetdata[$row][$col]=null;
				// }		
			// }
		// }
		return $sheetdata;
	}
	
	public function getAllSheets()
	{
		$array = array();
        $book = $this->listWorksheetNames();
		$cnt = count($book);
		for($i=0;$i<$cnt;$i++){
			$array[$book[$i]] = $this->getSheet($i);
		}
		return $array;
	}

	public function getSheetByName($SheetName)
	{
		return $this->getSheet(array_search($SheetName,$this->listWorksheetNames()));
	}
	
	public function listWorksheetNames()
	{
		$WorksheetNames = array();
		foreach($this->workbook->children() as $sheet){
			$WorksheetNames[] = (string) $sheet['name'];
		}
		return $WorksheetNames;
	}
	
	public function getMaxRow($SheetNo)
	{
		$maxRow = 0;
		foreach($this->sheets[$SheetNo]->children() as $cols){
			foreach($cols->children() as $cell){
				$cell_r = (string)$cell->attributes()->r;
				if(preg_match('|^([A-Z]{1,3})([0-9]+)$|',$cell_r,$match)){
					if($match[2] > $maxRow){
						$maxRow = $match[2];
					}
				}
			}
		}
		return $maxRow;	
	}
	
	public function getMaxCol($SheetNo)
	{
		$maxCol = 0;
		foreach($this->sheets[$SheetNo]->children() as $cols){
			foreach($cols->children() as $cell){
				$cell_r = (string)$cell->attributes()->r;
				if(preg_match('|^([A-Z]{1,3})([0-9]+)$|',$cell_r,$match)){
					$_col = self::columnIndexFromString($match[1]);
					if($_col > $maxCol){
						$maxCol = $_col;
					}
				}
			}
		}
		return $maxCol;	
	}
	
	public static function columnIndexFromString($id)
	{
		$cnt = strlen($id);
		if(!($cnt>0) || !preg_match('|^[A-Z]{1,3}$|',$id)){		
			return null;
		}
		
		$ret = 0;
		for($i=0;$i<$cnt;$i++){
			$s = substr($id,($cnt-$i-1),1);
			$ret += (ord($s)-ord('A')+1)*pow(26,$i);
		}
		return $ret;
	}
	
	public static function stringFromColumnIndex($col)
	{
	  $ret = '';
	  $amari = $col % 26;
	  if($amari==0) $amari=26;
	  $ret = chr(64 + $amari);
	  while ($col >= 26){
		$col = ($col - $amari) / 26;
		$amari = $col % 26;
		if($amari==0) $amari=26;
		$ret = chr(64 + $amari) . $ret;
	  }
	  return $ret;
	}

	static function relativeReference($formula, $src, $dst)
	{
		
		//offsetを取得
		preg_match('|(\$?)([A-Z]{1,3})(\$?)([0-9]+)|',$src,$match_src);
		preg_match('|(\$?)([A-Z]{1,3})(\$?)([0-9]+)|',$dst,$match_dst);
		
		$offset_col = self::columnIndexFromString($match_dst[2])-self::columnIndexFromString($match_src[2]);
		$offset_row = $match_dst[4] - $match_src[4];

		preg_match_all('|(\$?[A-Z]{1,3}\$?[0-9]+)|',$formula,$cellId,PREG_PATTERN_ORDER);
		$after = array();
		$before = array();
		foreach($cellId[1] as $cell){
			if(preg_match('|(\$?)([A-Z]{1,3})(\$?)([0-9]+)|',$cell,$match)){
				if(!($match[1]==='$'&&$match[3]==='$')){
					$before[] = '|'.$cell."|";
					$ColNo = self::columnIndexFromString($match[2]);
					$RowNo = $match[4];
					if($match[1]!=='$')	$ColNo+=$offset_col;
					if($match[3]!=='$') $RowNo+=$offset_row;
					$ColId = self::stringFromColumnIndex($ColNo);
					$after[] = $match[1].$ColId.$match[3].$RowNo;
				}
			}
		}
		return preg_replace($before, $after, $formula);
	}
	
	private function debug($arg)
	{
		echo "<pre>";
		var_dump($arg);
		echo "</pre>";
	}
}

class PHPExcelReader_Cell
{
	public $v = null;
	public $f = null;
	public function __construct($pValue = NULL,$pformula = NULL)
	{
		$this->v = $pValue;
		$this->f = $pformula;
	}
	
	public function getValue()
	{
		return $this->v;
	}
	
	public function getFormula()
	{
		return $this->f;
	}
	
	public function __toString()
	{
		$ret = $this->v;
		if($this->f!==null){
			$ret = $this->f;
		}
		return (string)$ret;
	}
	
}

?>