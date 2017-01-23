var TemplateEngine = function(leftFlag, rightFlag) {
	return function(html, options) {
		var re = re = new RegExp(leftFlag + "(.+?)?" + rightFlag, "g"), reExp = /(^( )?(if|for|else|switch|case|break|{|}))(.*)?/g, cursor = 0;
		
		code = obj2str(options);
		code += ';var r=[];\n';

		while(match = re.exec(html)) {
			add(html.slice(cursor, match.index))(match[1], true);
			cursor = match.index + match[0].length;
		}
		add(html.substr(cursor, html.length - cursor));
		code += 'return r.join("");';

		function add(line, js) {
			js? (code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n') :
				(code += line != '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '');
			return add;
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
						str+= isFirst? key + " = {\n" : key + ":{\n";
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

		return new Function(code.replace(/[\r\t\n]/g, ''))();
	}
}
