$(function(){

	/*画面設定部分 ここから*/
	var height_offset = -50;
	
	$("#left_pane").after($("#notice"));
	$(".pane").css('height' ,$(window).height()+height_offset+'px');

	$("#left_pane").css('width' ,'300px');
	$(".right_pane").css('width' ,$(window).width()-450+'px');
	$(".pane").css('overflow-y' ,'scroll');
	
	$(window).resize(function(){
		$(".right_pane").css('width' ,$(window).width()-450+'px');
		$(".pane").css('height' ,$(window).height()+height_offset+'px');
	});
	
	$("#form_evalcell").hide();
	//$("[id^=label_]").hide();
	/*画面設定部分 ここまで*/

	/*グローバル変数ここから*/
	var obj_data = {};
	var point_char = {10:"○",5:"△",0:"―",null:"×"};
	/*グローバル変数ここまで*/
	
	//評価基準データ（model)アップロード
	$("#modelupload").on("change",function(){
		console.log("#modelupload","change");
		var fd = new FormData();
		if ($("#modelupload").val()!== '') {
			fd.append( "model", $("#modelupload").prop("files")[0] );
		}
		var postData = {
			type : "POST",
			dataType : "text",
			data : fd,
			processData : false,
			contentType : false
		};
		$.ajax("xlsx2json.php", postData).done(function( json_data ){
			if( json_data.substr(0,5) != "Error" && json_data.substr(0,14) != "Could not open"){
				obj_data["model"] = JSON.parse(json_data);
				$("#group_show_model").show();
				obj_data["model_filename"]=basename($("#modelupload").val());
				$("#group_show_model > #model_filename").html(obj_data["model_filename"]);
				$("#group_modelupload").hide();

				localStorage.removeItem('model');
				$('#form_model').empty();
			} else {
				alert("ファイルにエラーがあります。");
				obj_data["model"] = {};
				delete obj_data["model_filename"];
				$("#group_show_model").hide();
				$("#group_modelupload").show();
			}
		});
	});
	
	//評価基準データ（model)表示
	$("#btn_show_model").on("click",function(){
		console.log("#btn_show_model","click");
		$("ul#filelist > li").css("background-color","#EEEEEE");
		
		$("#form_model").html("<h3>評価基準データ設定 <button id='btn_del_model' class='m-btn mini red rnd' style='float:right'><i class='fa fa-trash-o'></i> 評価基準データファイルをクリア</button></h3>"+show_sheet(obj_data["model"]));

		for(var sheetname in obj_data["model"]){
			if(obj_data["model"].hasOwnProperty(sheetname)){
				if(!isset(obj_data["evalmodel"])){
					obj_data["evalmodel"] = {};
				}
				if(!obj_data["evalmodel"].hasOwnProperty(sheetname)){
					obj_data['evalmodel'][sheetname]={};
				}
			}
		}

		SetStyleTable(obj_data["evalmodel"]);
		
		$(".right_pane").hide();
		$("#form_model").show();
		$(".pane").css('float' ,'left');
		$(".pane").css('height' ,$(window).height()+height_offset+'px');
		$(".right_pane").css('width' ,$(window).width()-450+'px');
		$(".right_pane").css('overflow-y' ,'scroll');
	
	});

	//評価基準データ（model)削除
	$("#form_model").on("click","#btn_del_model",function(){
		if( confirm("評価基準データをクリアをしますか？") ) {
			obj_data["model"] = {};
			delete obj_data["model_filename"];
			obj_data['evalmodel'] = {};
			$(".right_pane").hide();
			$("#form_model").empty();
			$("#group_show_model").hide();
			$("#group_modelupload").show();
		}
	});

	//評価対象ファイル(target)アップロード
	$("#fileupload").on("change",function(){
		console.log("#fileupload","change");
		var fd = new FormData();
		
		if($("#fileupload").prop("files").length>500){
			alert("500ファイルを超えるアップロードはできません。");
			return;
		}
		
		if($("#fileupload").prop("files").length>0) {
			for(var i=0;i<$("#fileupload").prop("files").length;i++){
				if(i<500){
					fd.append( "upfile"+i, $("#fileupload").prop("files")[i] );
				}
			}
		}
		var postData = {
			type : "POST",
			dataType : "text",
			data : fd,
			processData : false,
			contentType : false
		};
		
		
		$("ul#filelist").empty();
		$("ul#filelist").after("<div id='spinner' style='text-align:center;'><i class='fa fa-spinner fa-pulse fa-4x'></i></div>");
		
		$.ajax("xlsx2json.php", postData).done(function( json_data ){
			
			if(!isset(obj_data["target_files"])){
				obj_data["target_files"] = {};
			}
			
			//console.log(json_data);
			if( json_data.substr(0,5) != "Error" && json_data.substr(0,14) != "Could not open"){
			
				var _obj_target = JSON.parse(json_data);

				$(".right_pane").hide();
				for(var upload_filename in _obj_target){
					if(_obj_target.hasOwnProperty(upload_filename)){

						var new_uploadfilename = upload_filename;
						if(obj_data["target_files"].hasOwnProperty(new_uploadfilename)){
							var i=1;
							while(new_uploadfilename == upload_filename){
								var _filename = upload_filename + "(" + i++ + ")";
								if(!obj_data["target_files"].hasOwnProperty(_filename)){
									new_uploadfilename = _filename;
								}
								if(i>100){ break; }
								console.log(_filename,new_uploadfilename);
							}
						}
						obj_data["target_files"][new_uploadfilename] = _obj_target[upload_filename];
					}
				}
				
			} else {
				alert("ファイルにエラーがあります。");
			}
			
			//console.log(obj_data["target_files"]);
			obj_data["target_files"] = objectSort(obj_data["target_files"]);
			
			//$("ul#filelist").empty();
			$("#spinner").remove();
			for(var filename in obj_data["target_files"]){
				if(obj_data["target_files"].hasOwnProperty(filename)){
					$("ul#filelist").append("<li data-filename='"+filename+"'>"+filename+"</li>");
				}
			}
		});
	});

	
	var label = {};
	$(".label").each(function(){
		label[$(this).prop('id')] = $(this).prop('outerHTML');
	});

    
	$("h2").on("dblclick",function(){
		if($("ul#filelist > li").length > 0 ){
			var childWindow = window.open('about:blank');
			childWindow.document.open();
			childWindow.document.write('<!DOCTYPE HTML><html><head><title>Excel課題採点結果</title><meta charset="utf-8"><link href="style.css" rel="stylesheet"></head><body>');
			childWindow.document.write("<h2>Excel課題採点結果</h2>")
            childWindow.document.write("<p>ファイル数:"+$("ul#filelist > li").length+"</p>")
            childWindow.document.write("<table class='bordered' style='width: initial;'><tr><th>ファイル名</th><th>得点</th><th>内訳</th></tr>");
			
			$("ul#filelist > li").each(function(){
                var obj_score = score_sheet(obj_data["target_files"][$(this).data("filename")],obj_data['evalmodel']);
                var html="";
                html+="<tr>";
                html+="<td style='text-align:left;'>"+$(this).data("filename")+"</td>"
                html+="<td style='font-size:1.3em;'>"+obj_score.score+"</td>"
                html+="<td>合計:<strong>"+obj_score.point+"</strong>／<small>"+(obj_score.count_eval*10)+"</small> point"
                html+="　　　未入力:<strong>"+obj_score.count_isset_ng+"</strong>／<small>"+obj_score.count_isset+"</small>箇所</pre></td>"
                html+="</tr>";
				childWindow.document.write(html);
			});
			childWindow.document.write("</table>");
			childWindow.document.write("</body></html>");
			childWindow.document.close();
			childWindow = null;
			html = null;
		}
	});
		
	//評価対象ファイル(target)すべて表示
	$("#btn_show_all_target").on("click",function(){
		
		//$("ul#filelist > li").css("background-color","#EEEEEE");
		//console.log(label);
		
		if($("ul#filelist > li").length > 0 && confirm("表示が完了するまでに数分かかります。実行してよろしいですか？")){
			var childWindow = window.open('about:blank');
			childWindow.document.open();
			childWindow.document.write('<!DOCTYPE HTML><html><head><title>Excel課題評価結果</title><meta charset="utf-8"><link href="style.css" rel="stylesheet"></head><body>');
			
			$("ul#filelist > li").each(function(){
				var html = "<h3>"+$(this).data("filename")+"</h3>"+show_sheet(obj_data["target_files"][$(this).data("filename")],obj_data['evalmodel'],label)+"<br class='clear' />";
				childWindow.document.write(html);
			});
			childWindow.document.write("</body></html>");
			childWindow.document.close();
			childWindow = null;
			html = null;
		}
	});

	//評価対象ファイル(target)個別表示
	$("ul#filelist").on("click","li",function(){
		$(".right_pane").hide();
        $("#form_evalcell").hide();
		
		$("ul#filelist > li").css("background-color","#EEEEEE");
		$(this).css("background-color","#EEEE00");
		
		$("#result_form").show();
        $("#result_form").data("filename",$(this).data("filename"));
		$("#result_form").html("<h3>"+$(this).data("filename")+ "<button id='btn_del_target' class='m-btn mini red rnd' style='float:right'><i class='fa fa-trash-o'></i> このファイルを削除</button></h3>"+show_sheet(obj_data["target_files"][$(this).data("filename")],obj_data['evalmodel'],label));
		$(".right_pane").css('width' ,$(window).width()-450+'px');
		$(".pane").css('height' ,$(window).height()+height_offset+'px');
		$(".right_pane").css('overflow-y' ,'scroll');
		$("#btn_del_target").data("filename",$(this).data("filename"));
		
	});
    
	//評価対象ファイル(target)個別削除
	$("ul#filelist").on("dblclick","li",function(){
		if( confirm("["+$(this).data("filename")+"]をリストから削除をしますか？") ) {
			delete obj_data["target_files"][$(this).data("filename")];
			if(!obj_data["target_files"].hasOwnProperty($(this).data("filename"))){
				$(this).remove();
				$("#result_form").empty();
				$(".right_pane").hide();
			}
		}
	});
	//評価対象ファイル(target)個別削除
	$("#result_form").on("click","#btn_del_target",function(){
		if( confirm("["+$(this).data("filename")+"]をリストから削除をしますか？") ) {
			delete obj_data["target_files"][$(this).data("filename")];
			if(!obj_data["target_files"].hasOwnProperty($(this).data("filename"))){
				$("ul#filelist > li[data-filename='"+$(this).data("filename")+"']").remove();
				$("#result_form").empty();
				$(".right_pane").hide();
			}
		}
	});

    //評価対象ファイル(target) セルの値表示
	$("#result_form").on("mouseenter","pre",function(event){
        var filename = $("#result_form").data("filename");
        var sheetname = $(this).parents(".exceltable").data("sheetname");
        var cellid = $(this).parents(".cell").data("cellid");
        var cell = obj_data["target_files"][filename][sheetname][cellid];
        //console.log(filename,sheetname,cellid,cell);
        if(isset(cell) && cell.f != null){
            $("#hover_cell").show();
            $("#hover_cell").html(cell.v);
            $("#hover_cell").offset($(this).parents(".cell").position());
        }
	});
	$("#result_form").on("mouseout","td.cell",function(event){
        $("#hover_cell").hide();
	});
    
	
	//評価基準設定（未入力チェック）
	$("#form_model").on("click","td.cell",function(){
		
		var cellId = $(this).data("cellid");
		var sheetname = $(this).parents(".exceltable").data("sheetname");
        
		if(!obj_data['evalmodel'][sheetname].hasOwnProperty(cellId)){
			//$(this).css("background-color","orange");
			obj_data['evalmodel'][sheetname][cellId]=new EvalCriteria();
		} else {
			if(obj_data['evalmodel'][sheetname][cellId].enable==false){
				//$(this).css("background-color","orange");
				obj_data['evalmodel'][sheetname][cellId].enable = true;
				obj_data['evalmodel'][sheetname][cellId].isset = true;
			} else {
				//$(this).css("background-color","");
				obj_data['evalmodel'][sheetname][cellId].enable = false;
			}
		}
		SetStyleTable(obj_data['evalmodel']);
		//console.log("td.cell click",sheetname,cellId,obj_data['evalmodel']);
	});	
	
	//評価基準データ詳細設定画面表示
	$("#form_model,#result_form").on("dblclick","td.cell",function(){
		
        //console.log($(this).data());
		$("#form_evalcell").hide();
		
		var cellId = $(this).data("cellid");
		var sheetname = $(this).parents(".exceltable").data("sheetname");
        var pre_value = $(this).children("pre").text();
        
        //console.log(cellId,obj_data['evalmodel'][sheetname][cellId]);
		
		if(!obj_data['evalmodel'][sheetname].hasOwnProperty(cellId)){
			obj_data['evalmodel'][sheetname][cellId]=new EvalCriteria();
			obj_data['evalmodel'][sheetname][cellId].isset = false;
		} else {
			obj_data['evalmodel'][sheetname][cellId].enable = true;
			obj_data['evalmodel'][sheetname][cellId].isset = false;
		}
		//$(this).css("background-color","red");
		
		//候補を取得し分類
		var f_list=[];
		var v_list=[];
		
		//既に設定済みのデータを読み込み
		var obj_eval_list = obj_data['evalmodel'][sheetname][cellId].eval;
		for(var i=0;i<obj_eval_list.length;i++){
			if(obj_eval_list[i].f != null){
				f_list.push({f:obj_eval_list[i].f,point:obj_eval_list[i].point,count:0,v_list:{}});
			} else if(obj_eval_list[i].v != null){
				v_list.push({v:obj_eval_list[i].v.toString(),point:obj_eval_list[i].point,count:0});
			}
		}
		//console.log(f_list,v_list);
		var _set_data = function(obj_cell){
			if(isset(obj_cell)){
				if(isset(obj_cell.f)){
					var id = null;
					for (var i = 0; i < f_list.length; i ++) {
						if(isset(f_list[i].f) && f_list[i].f === obj_cell.f){
								id = i;
						}
					}
					if(id==null){
                        var obj_v_list = {};
                        obj_v_list[obj_cell.v] = 1;
						f_list.push({f:obj_cell.f,count:1,point:"",v_list: obj_v_list});
					} else {
                        
						f_list[id].count++;
                        if(f_list[id].v_list.hasOwnProperty(obj_cell.v)){
                            f_list[id].v_list[obj_cell.v]++;
                        } else {
                            f_list[id].v_list[obj_cell.v]=1;
                        }
                        
					}
				}
				if(isset(obj_cell.v)){
					var id = null;
					for (var i = 0; i < v_list.length; i ++) {
						if(isset(v_list[i].v) && v_list[i].v === obj_cell.v){
								id = i;
						}
					}
					if(id==null){
						v_list.push({v:obj_cell.v,count:1,point:""});
					} else {
						v_list[id].count++;
					}
				}
			}
		}
		//console.log(f_list,v_list);
        
		//モデルファイルより候補データを取得
		_set_data(obj_data["model"][sheetname][cellId]);
		
		//判定ファイルより候補データを取得
		for(var filename in obj_data["target_files"]){
			if(obj_data["target_files"].hasOwnProperty(filename)){
				_set_data(obj_data["target_files"][filename][sheetname][cellId]);
			}
		}

		
		f_list = f_list.sort(function(a,b){return -(a.count-b.count)});
		v_list = v_list.sort(function(a,b){return -(a.count-b.count)});
        
		
		var cnt_f = 1;
		$("#table_f").empty();
		$("#table_f").data("sheetname",sheetname);
		$("#table_f").data("cellid",cellId);
		
		$("#table_f").append("<tr><th></th><th>数式</th><th>回答数</th><th>判定</th></tr>");
		for (var i = 0; i < f_list.length; i ++) {
			var cell = f_list[i].f;
			cell = cell.replace( /_xlfn./g , "" ) ;
            var style="";
            if(pre_value == cell){
                style="background-color:pink"
            }
			var html = "<th>"+(cnt_f++)+"</th>";
            html += "<td class='cell_f' style='"+style+"'>"+cell+"</td>";
            html += "<td style='"+style+"'>"+f_list[i].count+"</td>";
			if(isset(f_list[i].point) || f_list[i].point === null){
				html += "<td class='point' data-f='"+f_list[i].f+"'  data-v_list='"+JSON.stringify(f_list[i].v_list)+"' data-point='"+f_list[i].point+"'>"+point_char[f_list[i].point]+"</td>";
			} else {
				html += "<td class='point' data-f='"+f_list[i].f+"' data-v_list='"+JSON.stringify(f_list[i].v_list)+"'></td>";
			}
			$("#table_f").append("<tr>" + html + "</tr>");
		}
		var cnt_v = 1;
		$("#table_v").empty();
		$("#table_v").data("sheetname",sheetname);
		$("#table_v").data("cellid",cellId);
		$("#table_v").append("<tr><th></th><th>値</th><th>回答数</th><th>判定</th></tr>");
		for (var i = 0; i < v_list.length; i ++) {
			var html = "<th>"+(cnt_v++)+"</th><td class='cell_v'>"+v_list[i].v+"</td><td>"+v_list[i].count+"</td>";
			if(isset(v_list[i].point)){
				html += "<td class='point' data-v='"+v_list[i].v+"' data-point='"+v_list[i].point+"'>"+point_char[v_list[i].point]+"</td>";
			} else {
				html += "<td class='point' data-v='"+v_list[i].v+"'></td>";
			}
			$("#table_v").append("<tr>" + html + "</tr>");
		}
		
		//設定
		$("#eval_caption").html("シート「" + sheetname + "」-セル" + cellId);
		
		//$("#form_model").hide();
		$("#form_evalcell").show();
		$("#form_evalcell").css("position","absolute");
		$("#form_evalcell").css($(this).offset());
		//$("#left_pane").after($("#form_evalcell"));
		
	});	
    
	$("#table_f").on("mouseenter","td.point",function(){
        var obj_v_list = $(this).data("v_list");
        
        var flg_show = false;
        var html = "<table class='v_list' border><tr><th>値</th><th>回答数</th></tr>";
        for(var v in obj_v_list){
            if(obj_v_list.hasOwnProperty(v)){
                html += "<tr><th>"+v+"</th><td>"+obj_v_list[v]+"</td></tr>";
                flg_show = true;
            }
        }
        html += "</table>";    
           
        if(flg_show){
            $("#hover_cell").show();
            $("#hover_cell").html(html);
            $("#hover_cell").offset($(this).offset());
            var offset = $(this).offset();
            $("#hover_cell").offset({top:offset.top-10,left: offset.left + $(this).context.offsetWidth});
        }
    });
	$("#table_f").on("mouseout","td.point",function(){
        $("#hover_cell").hide();
    });

	//評価基準データ詳細設定＿配点設定
	$("#table_f,#table_v").on("click","td.point",function(){
		var sheetname = $("#table_v").data("sheetname");
		var cellId = $("#table_v").data("cellid");
		if(!isset($(this).data("point"))){
			$(this).data("point",10);
			$(this).html(point_char[10]);
		} else if($(this).data("point")==10){
			$(this).data("point",5);
			$(this).html(point_char[5]);
		} else if($(this).data("point")==5){
			$(this).data("point",0);
			$(this).html(point_char[0]);
		} else {
			$(this).data("point",null);
			$(this).html(point_char[null]);
		}
		
        obj_data['evalmodel'][sheetname][cellId].eval = [];
		 $("#table_f .point,#table_v .point").each(
			function(){
				var obj_ret = {v:null,f:null,point:0}
				if(isset($(this).data("v"))) {
					obj_ret.v=$(this).data("v");
				}
				if(isset($(this).data("f"))) {
					obj_ret.f=$(this).data("f");
				}
				if(isset($(this).data("point")) || $(this).data("point") === null) {
					obj_ret.point=$(this).data("point");
				}
				
				obj_data['evalmodel'][sheetname][cellId].eval.push(obj_ret);
			}
		);
		obj_data['evalmodel'][sheetname][cellId].enable = true;
		obj_data['evalmodel'][sheetname][cellId].isset = false;
		//console.log($("#table_f").data("sheetname"),$("#table_f").data("cellid"),$(this).data("f"),$(this).data("v"),$(this).data("point"));
		//console.log(obj_data['evalmodel']);
	});

	//評価基準データ詳細設定＿非表示
	$("#btn_back_sheet").click(function(){
		$("#form_evalcell").hide();
        if($("#form_model").css("display")!=="none"){
            SetStyleTable(obj_data['evalmodel']);
        }
        if($("#result_form").css("display")!=="none"){
            var filename = $("#result_form").data("filename");
            $("#result_form").html("<h3>"+filename+"<button id='btn_del_target' class='m-btn mini red rnd' style='float:right'><i class='fa fa-trash-o'></i> このファイルを削除</button></h3>"+show_sheet(obj_data["target_files"][filename],obj_data['evalmodel'],label));

        }

	});
	
	//データ一時保存
	$("#btn_save_tmp").on("click",function(){
		if(!(Object.keys(obj_data).length === 0)){
			localStorage.setItem('obj_data', base64encode(zip_deflate(utf16to8(JSON.stringify(obj_data)))));

		} else {
			if(confirm("ブラウザに記憶したデータをクリアします。\n実行しても良いですか？")){
				localStorage.removeItem('obj_data');
			}
		}
	});
	$("#btn_load_tmp").on("click",function(){
        $(".right_pane").hide();
		if(isset(localStorage.getItem('obj_data'))){
			obj_data = JSON.parse(utf8to16(zip_inflate(base64decode(localStorage.getItem('obj_data')))));
			$("ul#filelist").empty();
			obj_data["target_files"] = objectSort(obj_data["target_files"]);
			for(var filename in obj_data["target_files"]){
				if(obj_data["target_files"].hasOwnProperty(filename)){
					$("ul#filelist").append("<li data-filename='"+filename+"'>"+filename+"</li>");
				}
			}

			if(isset(obj_data["model_filename"])){
				$("#group_show_model > #model_filename").html(obj_data["model_filename"]);
				$("#group_show_model").show();
				$("#group_modelupload").hide();
			} else {
				$("#group_show_model").hide();
				$("#group_modelupload").show();
			}
		}
	});
	$("#btn_save_file").on("click",function(){
		if(!(Object.keys(obj_data).length === 0)){
            var tmp_obj_data = {target_files: obj_data["target_files"]};
			var data = JSON.stringify(tmp_obj_data);
			var blob = new Blob([ data ], { "type" : "text/plain" });
			$("a#btn_save_file").prop("href",window.URL.createObjectURL(blob));
		} else {
			alert("ファイルに保存するデータが生成されていません。")
		}
	});

	$("#btn_load_file").on("click",function(){
        $(".right_pane").hide();
		$("#jsonupload").click();
	});
	$("#jsonupload").on("change",function(){
		var f = $("#jsonupload").prop("files")[0];
		var reader = new FileReader();
		reader.onload = (function(theFile) {
			return function(e) {
				var json = (e.target.result);
				var tmp_obj_data = JSON.parse(json);
                
                if(isset(tmp_obj_data["target_files"])){
                    $("ul#filelist").empty();
                    obj_data["target_files"] = objectSort(tmp_obj_data["target_files"]);
                    for(var filename in obj_data["target_files"]){
                        if(obj_data["target_files"].hasOwnProperty(filename)){
                            $("ul#filelist").append("<li data-filename='"+filename+"'>"+filename+"</li>");
                        }
                    }
                }

				// if(isset(obj_data["model_filename"])){
					// $("#group_show_model > #model_filename").html(obj_data["model_filename"]);
					// $("#group_show_model").show();
					// $("#group_modelupload").hide();
				// } else {
					// $("#group_show_model").hide();
					// $("#group_modelupload").show();
				// }
				
			};
		})(f);
		reader.readAsText(f);
        $('#jsonupload').replaceWith($('#jsonupload').clone(true));
	});
	$("#btn_save_modelfile").on("click",function(){
		if(!(Object.keys(obj_data).length === 0)){
            var tmp_obj = {}
            if(obj_data.hasOwnProperty("model_filename")){
                tmp_obj["model_filename"] = obj_data["model_filename"];
            }
            if(obj_data.hasOwnProperty("evalmodel")){
                tmp_obj["evalmodel"] = obj_data["evalmodel"];
            }
            if(obj_data.hasOwnProperty("model")){
                tmp_obj["model"] = obj_data["model"];
            }
            var data = JSON.stringify(tmp_obj);
			var blob = new Blob([ data ], { "type" : "text/plain" });
			$("a#btn_save_modelfile").prop("href",window.URL.createObjectURL(blob));
		} else {
			alert("ファイルに保存するデータが生成されていません。")
		}
	});
	$("#btn_load_modelfile").on("click",function(){
		$("#jsonmodelupload").click();
	});
	$("#jsonmodelupload").on("change",function(){
		var f = $("#jsonmodelupload").prop("files")[0];
		var reader = new FileReader();
		reader.onload = (function(theFile) {
			return function(e) {
				var json = (e.target.result);
				var tmp_obj = JSON.parse(json);
                if(tmp_obj.hasOwnProperty("model_filename")){
                    delete obj_data["model_filename"];
                    obj_data["model_filename"] = tmp_obj["model_filename"];
                }
                if(tmp_obj.hasOwnProperty("evalmodel")){
                    delete obj_data["evalmodel"];
                    obj_data["evalmodel"] = tmp_obj["evalmodel"];
                }
                if(tmp_obj.hasOwnProperty("model")){
                    delete obj_data["model"];
                    obj_data["model"] = tmp_obj["model"];
                }
				if(isset(obj_data["model_filename"])){
					$("#group_show_model > #model_filename").html(obj_data["model_filename"]);
					$("#group_show_model").show();
					$("#group_modelupload").hide();
				} else {
					$("#group_show_model").hide();
					$("#group_modelupload").show();
				}
			};
		})(f);
		reader.readAsText(f);
        $('#jsonmodelupload').replaceWith($('#jsonmodelupload').clone(true));

	});
});
