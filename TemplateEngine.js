var TemplateEngine = function(leftFlag, rightFlag) {

	var re = new RegExp(leftFlag + "\\s*(.+?)\\s*" + rightFlag, "g"),
		vExpIf = /<([a-z]+)[^((\1|\/)>)]*\s(v-if|v-else-if)=(["'])(.*?)\3.*?(\1|\/)>(<([a-z]+)[^((\7|\/)>)]*\s(v-else-if|v-else).*?(\7|\/)>)?/g,
		vExpElse = /<([a-z]+)[^((\1|\/)>)]*\s(v-else).*?(\1|\/)>/g,
	   	vExpList = /<([a-z]+).*\s(v-for)=(["'])(.+?)\3.*(\1|\/)>(<([a-z]+)[^((\7|\/)>)]*\s(v-else).*?(\7|\/)>)?/g,
		vExpListTag = /\s*((\w+)|\(\s*(\w+)\s*,\s*(\w+)\s*\))\s+in\s+(.+)/,
		vExpListVal = /\.|\[["']|\[(?=\d)|['"]?\]\[["']?|['"]?\]\.|['"]?\]/,
		vExpHasVariable = /\[([^\d]+)\]/g;
		vExpCheckIsPath = /[^\.\w\s\[\]]/g;

	return function(html, options) {
		html = html.replace(/[\r\t\n]/g, '');

		var cursor = 0, match, code = obj2str(options);
		code += ';\n';

		while(match = vExpList.exec(html) || vExpIf.exec(html)) {
			var lastIndex = vExpList.lastIndex,
			    realListTpl = vueTpl(match);
		
			if(match[2]==='v-for'){
				html = html.slice(cursor, match.index) + realListTpl + html.slice(match.index + match[0].length);
				vExpList.lastIndex = lastIndex - match[0].length + realListTpl.length;
			}else{
				html = html.slice(cursor, match.index) + realListTpl + html.slice(html.indexOf(match[0]) + match[0].length);
				vExpIf.lastIndex = lastIndex - match[0].length + realListTpl.length;
			}
		}

		while(match = re.exec(html)) {
			html = html.replace(re, function(){ return getDepTarget(arguments[1])||new Function((code+"return "+arguments[1]).replace(/[\r\t\n]/g, ''))();});
		}

		function vueTpl(matchInfo, pathMap){
			var ele = matchInfo[0],
				tag = matchInfo[2];

			if(matchInfo[8]){
				var hasElse = true;
				var isElse = matchInfo[8].toLowerCase() === 'v-else'?true:false;
				var isElseIf = matchInfo[8].toLowerCase() === 'v-else-if'?true:false;
			}

			var val,pathMap = pathMap || {},
				eleRealTpl = ele.replace(new RegExp("\\s"+ tag +"(=([\"'])(.*?)\\2)?"), function(v){
					val = arguments[3];
					return "";
				}),
				eleReal = '';

			switch(tag) {
				case 'v-for':
					var tmp = val.match(vExpListTag),
						item = tmp[2]?{name:tmp[2]} : {name:tmp[3], index:tmp[4]},
						items = tmp[5];

					items = getRealPath(items);
					
					var itemsKey = items.split(vExpListVal), key, target = options;

					while(key = itemsKey.shift()) {
						target = target[key];
					}

					for(var i = 0, index = 1, l = target.length; i<l; i++) {
						pathMap[item.name] = items + "["+i+"]";

						vExpIf.lastIndex = 0;
						var matchif, matchList, eleRealIf = '', eleRealTplTmp = eleRealTpl, cursor = 0;
						while(matchif = vExpIf.exec(eleRealTpl)) {
							var isIf = false;
							if(matchif.input.slice(0, matchif.index).match(">")===null){
								isIf = true;
							}else{
								var matchCheckList = vExpList.exec(eleRealTplTmp);
								if(!matchCheckList || matchif.index < matchCheckList.index || matchCheckList.index+matchCheckList[0].length < matchif.index){
									isIf = true;
								}
							}

							if(isIf){
								var realListTplIf = vueTpl(matchif, pathMap),
									matchElse = vExpElse.exec(eleRealTpl);


								eleRealIf += getRealTpl(eleRealTplTmp.slice(cursor, matchif.index));
								eleRealIf += realListTplIf;
								cursor = matchif.index + matchif[0].length;
								cursor += matchElse?matchElse[0].length:0;
							}
						}
						eleRealIf += getRealTpl(eleRealTplTmp.slice(cursor));
						eleRealTplTmp = eleRealIf;
	
						vExpList.lastIndex = 0, cursor = 0;
						while(matchList = vExpList.exec(eleRealTplTmp)) {
							var realListTpl = vueTpl(matchList, pathMap);
							eleReal += getRealTpl(eleRealTplTmp.slice(cursor, matchList.index));
							eleReal += realListTpl;
							cursor = matchList.index + matchList[0].length;
						}
						if(matchList){
							eleReal += getRealTpl(eleRealTplTmp.slice(cursor));
						}else if(!matchList){
							eleReal += getRealTpl(eleRealTplTmp);
						}
					}
					break;
				case 'v-if':
					eleReal = getIf();
					break;
				case 'v-else-if':
					eleReal = getIf();
					break;
				case 'v-else':
					eleReal = eleRealTpl;
					break;
			}


			function getIf(){
				if(val==='true'){
					val = true;
				}else if(val==='false'){
					val = false;
				}else if(val.match(/^[-+]?\d+(\.\d+)?$/)){
					val = +val;
				}else{
					if(val.match(vExpCheckIsPath)) {
						try
						{
							val = new Function((code+"return "+val).replace(/[\r\t\n]/g, ''))();
						}catch(err){
							val = undefined;
						}
					}else{
						val = getDepTarget(getRealPath(val));
					}
				}

				if(val){
					vExpElse.lastIndex = 0;
					var matchElse = vExpElse.exec(eleRealTpl);

					if(matchElse){
						eleReal = eleRealTpl.slice(0, matchElse.index);
					}else{
						eleReal = eleRealTpl;
					}
				}else if(hasElse){
					var matchStr = match.input.slice(match[0].length - match[6].length);
					vExpIf.lastIndex = 0;
					match = vExpIf.exec(matchStr);
					eleReal = vueTpl(match);
				}else{
					eleReal = '';
				}

				return eleReal;
			}

			function getRealTpl(tpl){
				return tpl.replace(re, function(){
					var match = arguments[1].split(vExpListVal);

					if(pathMap[match[0]]){
						match[0] = pathMap[match[0]];
						return leftFlag + match.shift() + '.' + match.join(".") + rightFlag;
					}else if(match[0]==item.name){
						match[0] = items;
						return leftFlag + match.shift() + '['+i+'].' + match.join(".") + rightFlag;
					}else{
						return leftFlag + match.shift() + rightFlag;
					}
				});
			}

			function getRealPath(items){
				items = items.replace(/^[^.\[]+/, function(val){
					return pathMap[val]?pathMap[val]:val;
				});

				items = items.replace(vExpHasVariable, function(){
					var tmp = arguments[1].replace(/^[^.\[]+/, function(val){
						return pathMap[val]?pathMap[val]:val;
					});

					return '.'+getDepTarget(tmp);
				})

				return items;
			}

			return eleReal;
		}

		function obj2str(source, isFirst, str, isArray){
			str = str===undefined?'var ':str;
			isFirst = isFirst === undefined?true:false;

			for (var key in source) {
				var type = Object.prototype.toString.call(source[key]);
				switch(type) {
					case '[object Array]':
						str+= isFirst?key + " = [\n" : key + ":[\n";
						str = obj2str(source[key], false, str, true);
						str+="\n],\n";
						break;
					case '[object Object]':
						str+= isFirst? key + " = {\n" : isArray? "{\n" : key + ":{\n";
						str = obj2str(source[key], false, str);
						str+= "\n},\n";
						break;	
					case '[object String]':
						str+= isFirst? key + " = \"" : isArray? "\"" : key + ":\"";
						str+= source[key];
						str+= "\",\n";
						break;
					case '[object Boolean]':
						str+= isFirst? key + " = " : isArray? "" : key + ":";
						str+= source[key];
						str+= ",\n";
						break;
					case '[object Number]':
						str+= isFirst? key + " = " : isArray? "" : key + ":";
						str+= source[key];
						str+= ",\n";
						break;
				}
			}
			if(str.substr(-2)===",\n")str = str.substr(0,str.length-2);
			return str;
		}

		function getDepTarget(str) {
			var keys = str.split(vExpListVal), index = 0, target = options;

			while(index < keys.length) {
				target = target[keys[index++]];
			}

			return target;
		}
		
		return html;
	}
}

//<div>My skills:<% if(showSkills) {%><%for(var index in skills) {%><a href="#"><%skills[index]%></a><%}%><%} else {%><p><%d.z[1]%></p><%}%></div>
