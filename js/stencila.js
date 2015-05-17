var Stencila = (function(Stencila){


	///////////////////////////////////////////////////////////////////////////////////////////////
	

	/**
	 * A HTML element
	 *
	 * Provides a similar API to the `Html::Node` in the 
	 * C++ module, which in turn is similar to the jQuery interface.
	 * A thin wrapper around a native DOM element.
	 * Provides some shortcuts to DOM manipulation, without having to 
	 * rely on the whole of jQuery as a dependency.
	 */
	var Node = Stencila.Node = function(dom){
		if(typeof dom==='string'){
			if(dom.substr(0,1)==='<'){
				var frag = document.createElement('div');
				frag.innerHTML = dom;
				this.dom = frag.children[0];
			} else {
				this.dom = document.querySelector(dom);
			}
		}
		else {
			this.dom = dom;
		}
	};

	/**
	 * Is this node a null? 
	 */
	Node.prototype.empty = function(){
		return this.dom?false:true;
	};

	/**
	 * Get or set an attribute
	 * 
	 * @param  {String} name  Name of attribute
	 * @param  {String} value Value for attribute
	 */
	Node.prototype.attr = function(name,value){
		if(value===undefined){
			var attr = this.dom.getAttribute(name);
			return attr?attr:'';
		} else {
			this.dom.setAttribute(name,value);
		}
	};

	/**
	 * Remove an attribute
	 * 
	 * @param  {String} name Name of attribute
	 */
	Node.prototype.erase = function(name){
		this.dom.removeAttribute(name);
	};

	/**
	 * Does this element have a particular attribute
	 * 
	 * @param  {String} name  Name of attribute
	 */
	Node.prototype.has = function(name){
		return this.dom.hasAttribute(name);
	};

	/**
	 * Get or set the HTML (inner) of this element
	 * 
	 * @param  {String} value HTML string
	 */
	Node.prototype.html = function(value){
		if(value===undefined) return this.dom.innerHTML;
		else this.dom.innerHTML = value;
	};

	/**
	 * Get or set the text of this element
	 * 
	 * @param  {String} value Text constent string
	 */
	Node.prototype.text = function(value){
		if(value===undefined) return this.dom.textContent;
		else this.dom.textContent = value;
	};

	/**
	 * Get array of child elements
	 */
	Node.prototype.children = function(){
		return this.dom.children;
	};

	/**
	 * Get the first child
	 */
	Node.prototype.first = function(){
		return new Node(this.dom.children[0]);
	};

	/**
	 * Get next sibling element
	 */
	Node.prototype.next = function(){
		return new Node(this.dom.nextElementSibling);
	};

	/**
	 * Get previous sibling element
	 */
	Node.prototype.previous = function(){
		return new Node(this.dom.previousElementSibling);
	};

	/**
	 * Append a child element
	 */
	Node.prototype.append = function(node){
		this.dom.appendChild(node.dom);
		return this;
	};

	/**
	 * Select child elements
	 * 
	 * @param  {String} selector Select child elements using a CSS selector
	 */
	Node.prototype.select = function(selector){
		return new Node(this.dom.querySelector(selector));
	};

	/**
	 * Clone this element
	 */
	Node.prototype.clone = function(){
		return new Node(this.dom.cloneNode(true));
	};


	///////////////////////////////////////////////////////////////////////////////////////////////


	var Request = Stencila.Request = {};

	/**
	 * Create a request
	 */
	Request.create = function(success,failure){
		var request = new XMLHttpRequest();
		request.onreadystatechange = function(){
			if(request.readyState === 4){
				if(request.status === 200){
					success(JSON.parse(request.responseText));
				} else {
					if(failure) failure();
					else Stencila.view.error(
						'Request failed: status='+request.statusText
					);
				}
			}
		};
		return request;
	};

	/**
	 * Set request headers
	 */
	Request.headers = function(request,headers){
		for(var header in headers) {
			if(headers.hasOwnProperty(header)) {
				request.setRequestHeader(header,headers[header]);
			}
		}
	};

	/**
	 * Get JSON data
	 */
	Request.get = function(url,headers,success,failure){
		var request = Request.create(success,failure);
		request.open("GET",url,true);
		request.setRequestHeader('Accept','application/json');
		Request.headers(request,headers);
		request.send();
	};

	/**
	 * Post JSON data
	 */
	Request.post = function(url,headers,data,success,failure){
		var request = Request.create(success,failure);
		request.open("POST",url,true);
		request.setRequestHeader('Content-Type','application/json');
		request.setRequestHeader('Accept','application/json');
		Request.headers(request,headers);
		request.send(JSON.stringify(data));
	};

	/////////////////////////////////////////////////////////////////////////////////////////////

	/**
	 * Connection to a server.
	 * 
	 * Implements the WAMP (http://wamp.ws) messaging protocol over
	 */
	var Connection = Stencila.Connection = function(){
		// Callbacks registered for remote procedure calls (see call() method)
		this.callbacks = {};
		// Identifier for messages; incremented in call method
		this.id = 0;
	};

	/**
	 * Connect to server
	 */
	Connection.prototype.connect = function(){
		// Automatically disconnect when page is unloaded
		var self = this;
		window.addEventListener("beforeunload", function(event){
			self.disconnect();
		});
	};

	/**
	 * Receive a message from the server
	 * 
	 * @param  {String} data
	 */
	Connection.prototype.receive = function(data){
		// Parse JSON
		var message = [8];
		try {
			message = JSON.parse(data);
		}
		catch(error) {
			console.error('Error parsing WAMP message data.\n  data:'+data+'\n  error:'+error);
		}
		// Dispatch based on WAMP code
		var code = message[0];
		if(code==50) this.result(message);
		else if(code==8){
			throw "WAMP error:"+message;
		}
		else {
			throw "WAMP message type unknown:"+code;
		}
	};

	/**
	 * Make a remote procedure call
	 * See https://github.com/tavendo/WAMP/blob/master/spec/basic.md#call-1
	 * 
	 * @param  {String}   method   Name of method to call
	 * @param  {Array}    args     Array of arguments
	 * @param  {Function} callback Function to call when method returns (potentially with a result)
	 */
	Connection.prototype.call = function(method,args,callback){
		args = args || [];
		// Increment id
		// According to https://github.com/tavendo/WAMP/blob/master/spec/basic.md#ids
		// "IDs in the session scope SHOULD be incremented by 1 beginning with 1"
		this.id++;
		// Generate a WAMP call array
		var wamp = [
			48,			// CALL
			this.id,	// Request|id
			{},			// Options|dict
			method,		// Procedure|uri
			args		// Arguments|list
		];
		// Register callback
		if(callback){
			this.callbacks[this.id] = callback;
		}
		// Send WAMP
		this.send(wamp);
	};

	/**
	 * Receive the result of a remote procedure call
	 * See https://github.com/tavendo/WAMP/blob/master/spec/basic.md#result-1
	 *
	 * This method is called when a WAMP RESULT message is received and is not meant to be called
	 * publically
	 */
	Connection.prototype.result = function(message){
		// [RESULT, CALL.Request|id, Details|dict, YIELD.Arguments|list]
		var id = message[1];
		var callback = this.callbacks[id];
		if(callback){
			var results = message[3];
			// WAMP allows for muliple returns
			// Only passing on a single result, the first
			var result = results[0];
			callback(result);
		}
	};

	/**
	 * Websocket connection class
	 */
	var WebSocketConnection = Stencila.WebSocketConnection = function(url){
		Connection.call(this);
		this.socket = null;
		this.connect(url);
	};
	WebSocketConnection.prototype = Object.create(Connection.prototype);

	/**
	 * Connect
	 * 
	 * @param  {String} url URL to connect to
	 */
	WebSocketConnection.prototype.connect = function(url){
		var self = this;
		// Create a new websocket
		self.socket = new WebSocket(url);
		// Bind some socket events
		//   when connection is opened...
		self.socket.onopen = function(event){
			self.ok = true;
		};
		//   when there are any connection errors...
		self.socket.onclose = function(event){
			console.warn("Connection closed");
			self.ok = false;
		};
		//   when a message is recieved...
		self.socket.onmessage = function(event){
			Connection.prototype.receive.call(self,event.data);
		};
		Connection.prototype.connect.call(this);
	};

	/**
	 * Disconnect
	 */
	WebSocketConnection.prototype.disconnect = function(){
		this.socket.close();
	};

	/**
	 * Send data
	 */
	WebSocketConnection.prototype.send = function(data){
		this.socket.send(data);
	};

	///////////////////////////////////////////////////////////////////////////////////////////////


	var Hub = Stencila.Hub = {};

	/**
	 * Username and permit strings for stenci.la
	 *
	 * Permit is used for authentication and CSRF validation
	 * for all asynchronous requests
	 */
	Hub.username = null;
	Hub.permit = null;

	/**
	 * Signin to stenci.la
	 *
	 * @param  {Function} then Callback once signed in
	 */
	Hub.signin = function(then) {
		var headers = {};
		// This page may already be at https://stenci.la and user already signed in
		// Check for that using cookies set by stenci.la when a user is authenticated
		if(window.location.host=="stenci.la"){
			var username = $.cookie('username');
			if(username){
				Hub.username = username;
			}
		} else {
			var credentials = Stencila.view.signin();
			if(credentials.password){
				var encoded = btoa(credentials.username+":"+credentials.password);
				headers["Authorization"] = "Basic "+encoded;
			}
		}

		// Get a permit to be used for subsequent requests
		Request.get(
			// Normally https will be used but in development http may be used. 
			// Using the current window protocol allows for that situation
			window.location.protocol+"//stenci.la/user/permit",
			headers,
			function(data){
				Hub.permit = data.permit;
				if(then) then();
			}
		);
	};

	/**
	 * Make a GET request to stenci.la
	 * 
	 * @param  {String}   path Path to resource
	 * @param  {Function} then Callback when done
	 */
	Hub.get = function(path,then) {
		if(!Hub.username) {
			// If not signed in then signin and then get
			Hub.signin(function(){
				Hub.get(path,then);
			});
		} else {
			Request.get(
				window.location.protocol+"//stenci.la/"+path,
				{"Authorization" : "Permit "+Hub.permit},
				then
			);
		}
	};

	/**
	 * Make a POST request to stenci.la
	 * 
	 * @param  {String}   path Path to resource
	 * @param  {String}   data Data to post
	 * @param  {Function} then Callback when done
	 *
	 * @todo Add POST JSON data to request
	 */
	Hub.post = function(path,data,then) {
		if(!Hub.username) {
			// If not signed in then signin and then post
			Hub.signin(function(){
				Hub.post(path,data,then);
			});
		} else {
			Request.post(
				window.location.protocol+"//stenci.la/"+path,
				{"Authorization" : "Permit "+Hub.permit},
				data,
				then
			);
		}
	};

	/**
	 * Signout of stenci.la
	 */
	Hub.signout = function() {
		Hub.username = null;
		Hub.permit = null;
	};

	///////////////////////////////////////////////////////////////////////////////////////////////

	/**
	 * The user interface view
	 *
	 * This is a basic stub. Themes define their own Views and assign
	 * it to `Stencila.com.view`.
	 */
	var View = Stencila.View = function(component){
		this.com = component;
	};

	View.prototype.info = function(message){
		console.info(message);
	};

	View.prototype.warn = function(message){
		console.warn(message);
	};

	View.prototype.error = function(message){
		console.error(message);
	};

	View.prototype.signin = function(){
		var username = prompt('Username for stenci.la');
		var password = prompt('Password for stenci.la');
		return {
			username: username,
			password: password
		};
	};

	View.prototype.change = function(property,value){
		console.log('Property changed: property='+property+' value='+value);
	};


	///////////////////////////////////////////////////////////////////////////////////////////////


	/**
	 * Base class for all components
	 */
	var Component = Stencila.Component = function(){
		// Create default view
		this.view = new View(this);

		// Collect host information
		var location = window.location;
		this.host = location.hostname;
		this.port = location.port;

		// Get the address of the component
		this.address = null;
		// ... from <meta> tag
		var address = new Node('head meta[itemprop=address]');
		if(!address.empty()) this.address = address.attr('content');
		// ... or from url
		if(!this.address) {
			var parts = window.location.pathname.split('/');
			// Remove the first part cause by the leading /
			if(parts[0]==="") parts.shift();
			// Remove the last part if it is a title slug
			var last = parts[parts.length-1];
			if(last.substr(last.length-1)=="-") parts.pop();
			this.address = parts.join('/');
		}

		// If on localhost attempt to activate
		this.active = 'off';
		if(this.host=='localhost'){
			this.activate();
		}
	};

	/**
	 * Set a property of the component and notify the view of 
	 * the change
	 * 
	 * @param {String} 	property Name of property
	 * @param {any} 	value    Value of property
	 */
	Component.prototype.set = function(property,value){
		this[property] = value;
		this.view.change(property,value);
	};

	/**
	 * Activate this component
	 */
	Component.prototype.activate = function(){
		if(this.active==='off'){
			this.set('active','activating');
			if(this.host=='localhost'){
				// On localhost, simply connect to the Websocket at the
				// same address
				var websocket = window.location.href.replace("http:","ws:");
				this.connection = new WebSocketConnection(websocket);
				this.set('active','on');
			} else {
				// Elsewhere, request stenci.la to activate a session
				// for this component
				var self = this;
				Hub.post(self.address+"/activate!",null,function(data){
					self.session = data;
					// Wait for three minutes for session to be ready
					var until = new Date().getTime()+1000*60*3;
					var wait = function(){
						Hub.get(self.session.url,function(data){
							self.session = data;
							if(self.session.ready){
								self.connection = new WebSocketConnection(self.session.websocket);
								self.set('active','on');
							}
							else if(new Date().getTime()>until){
								self.set('active','off');
								self.view.error('Failed to connect to session: '+self.session.url);
							}
							else {
								setTimeout(function() {
									wait();
								},1000);
							}
						});
					};
				});
			}
		}
	};

	/**
	 * Deactivate this component
	 */
	Component.prototype.deactivate = function(){
		if(this.active==='on' && this.host!=='localhost'){
			this.set('active','deactivating');
			var self = this;
			Hub.post(this.address+"/deactivate!",null,function(data){
				self.set('active','off');
			});
		}
	};

	///////////////////////////////////////////////////////////////////////////////////////////////

	/**
	 * A JavaScript rendering context
	 *
	 * Used for rendering stencils against.
	 * Provides an interface similar to that of the `Context`
	 * virtual base class in the C++ module.
	 */
	var Context = Stencila.Context = function(scope){
		this.scopes = [
			/**
			 * Functions exposed to contexts via an object 
			 * which is always the uppermmost scope of a `Context`
			 */
			{
				get: Request.get
			},
			scope||{}
		];
	};

	// Private methods for manipulating the stack
	// of scopes

	Context.prototype.push_ = function(value){
		var scope;
		if(value) scope = value;
		else scope = {};
		this.scopes.push(scope);
	};
	Context.prototype.pop_ = function(){
		this.scopes.pop();
	};
	Context.prototype.top_ = function(){
		return this.scopes[this.scopes.length-1];
	};
	Context.prototype.set_ = function(name,value){
		this.top_()[name] = value;
	};
	Context.prototype.get_ = function(name){
		for(var index=this.scopes.length-1;index>=0;index--){
			var value = this.scopes[index][name];
			if(value!==undefined) return value;
		}
	};
	Context.prototype.unset_ = function(name){
		delete this.top_()[name];
	};
	Context.prototype.evaluate_ = function(expression){
		var func = '';
		var index;
		for(index=0;index<this.scopes.length;index++){
			func += 'with(this.scopes['+index+']){\n';
		}
		func += 'return '+expression+';\n';
		for(index=0;index<this.scopes.length;index++){
			func += '}\n';
		}
		return Function(func).call(this);
	};

	// Methods to meet the API for a context

	/**
	 * Execute code within the context
	 * 
	 * @param code String of code
	 */
	Context.prototype.execute = function(code){
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.text = code;
		document.head.appendChild(script);
	};
	
	/**
	 * Assign an expression to a name.
	 * Used by stencil `import` and `include` elements to assign values
	 * to the context of the transcluded stencils.
	 * 
	 * @param name       Name to be assigned
	 * @param expression Expression to be assigned to name
	 */
	Context.prototype.assign = function(name, expression){
		this.top_()[name] = this.evaluate_(expression);
	};

	/**
	 * Get a text representation of an expression. 
	 * Used by stencil `text` elements e.g. `<span data-text="x">42</span>`
	 * 
	 * @param  expression Expression to convert to text
	 */
	Context.prototype.write = function(expression){
		var value = this.evaluate_(expression);
		return String(value);
	};

	/**
	 * Test whether an expression is true or false. 
	 * Used by stencil `if` elements e.g. `<span data-if="height>10">The height is greater than 10</span>`
	 * 
	 * @param  expression Expression to evaluate
	 */
	Context.prototype.test = function(expression){
		return this.evaluate_(expression)?true:false;
	};

	/**
	 * Mark an expression to be the subject of subsequent `match` queries.
	 * Used by stencil `switch` elements e.g. `<p data-switch="x"> X is <span data-match="1">one</span><span data-default>not one</span>.</p>`
	 * 
	 * @param expression Expression to evaluate
	 */
	Context.prototype.mark = function(expression){
		this.set_('_subject_',this.evaluate_(expression));
	};

	/**
	 * Test whether an expression matches the current subject.
	 * Used by stencil `match` elements (placed within `switch` elements)
	 * 
	 * @param  expression Expression to evaluate
	 */
	Context.prototype.match = function(expression){
		return this.get_('_subject_')===this.evaluate_(expression);
	};

	/**
	 * Unmark the current subject expression
	 */
	Context.prototype.unmark = function(){
		this.unset_('_subject_');
	};
	
	/**
	 * Begin a loop.
	 * Used by stencil `for` elements e.g. `<ul data-for="planet:planets"><li data-each data-text="planet" /></ul>`
	 * 
	 * @param  item  Name given to each item
	 * @param  expression Expression giveing an iterable list of items
	 */
	Context.prototype.begin = function(item,expression){
		var items = this.evaluate_(expression);
		if(items.length>0){
			this.push_();
			this.set_('_item_',item);
			this.set_('_items_',items);
			this.set_('_index_',0);
			this.set_(item,items[0]);
			return true;
		} else {
			return false;
		}
	};

	/**
	 * Steps the current loop to the next item. 
	 * Used by stencil `for` elements. See stencil `render`ing methods.
	 *
	 * If there are more items to iterate over this method should return `true`.
	 * When there are no more items, this method should do any clean up required 
	 * (e.g popping the loop namespace off a namespace stack) when ending a loop, 
	 * and return `false`. 
	 */
	Context.prototype.next = function(){
		var items = this.get_('_items_');
		var index = this.get_('_index_');
		if(index<items.length-1){
			index += 1;
			this.set_('_index_',index);
			var name = this.get_('_item_');
			var value = items[index];
			this.set_(name,value);
			return true;
		} else {
			this.pop_();
			return false;
		}
	};

	/**
	 * Enter a new namespace. 
	 * Used by stencil `with` element e.g. `<div data-with="mydata"><span data-text="sum(a*b)" /></div>`
	 *  
	 * @param expression Expression that will be the scope of the new context
	 */
	Context.prototype.enter = function(expression){
		this.push_(this.evaluate_(expression));
	};

	/**
	 * Exit the current namespace
	 */
	Context.prototype.exit = function(){
		this.pop_();
	};

	///////////////////////////////////////////////////////////////////////////////////////////////

	/**
	 * Stencil directives
	 *
	 * Implemented as inividual classes to allow for use in rendering
	 * stencils as well as in any user interfaces to directive elements 
	 * 
	 * Each directive has:
	 * 
	 * 	- a `get` method which extracts directive attributes from a node
	 * 	- a `set` method which stores directive attributes on a node
	 * 	- a `render` method which renders the directive in a context
	 * 	- an `apply` method which `get`s and `render`s
	 */
	
	var directiveRender = Stencila.directiveRender = function(node,context){
		if(node.has('data-exec')) return new Exec().apply(node,context);
		if(node.has('data-write')) return new Write().apply(node,context);
		if(node.has('data-with')) return new With().apply(node,context);

		if(node.has('data-if')) return new If().apply(node,context);
		if(node.has('data-elif') | node.has('data-else')) return;

		if(node.has('data-for')) return new For().apply(node,context);

		directiveRenderChildren(node,context);
	};
	var directiveRenderChildren = function(node,context){
		var children = node.children();
		for(var index=0;index<children.length;index++){
			directiveRender(
				new Node(children[index]),
				context
			);
		}
	};
	var directiveApply = function(node,context){
		this.get(node).render(node,context);
	};

	/**
	 * An `exec` directive
	 */
	var Exec = Stencila.Exec = function(details,code){
		this.details = details;
		this.code = code;
	};
	Exec.prototype.get = function(node){
		this.details = node.attr('data-exec');
		this.code = node.text();
		return this;
	};
	Exec.prototype.set = function(node){
		node.attr('data-exec',this.details);
		node.text(this.code);
		return this;
	};
	Exec.prototype.render = function(node,context){
		context.execute(this.code);
		return this;
	};
	Exec.prototype.apply = directiveApply;

	/**
	 * A `write` directive
	 */
	var Write = Stencila.Write = function(expr){
		this.expr = expr;
	};
	Write.prototype.get = function(node){
		this.expr = node.attr('data-write');
		return this;
	};
	Write.prototype.set = function(node){
		node.attr('data-write',this.expr);
		return this;
	};
	Write.prototype.render = function(node,context){
		node.text(context.write(this.expr));
		return this;
	};
	Write.prototype.apply = directiveApply;

	/**
	 * A `with` directive
	 */
	var With = Stencila.With = function(expr){
		this.expr = expr;
	};
	With.prototype.get = function(node){
		this.expr = node.attr('data-with');
		return this;
	};
	With.prototype.set = function(node){
		node.attr('data-with',this.expr);
		return this;
	};
	With.prototype.render = function(node,context){
		context.enter(this.expr);
		directiveRenderChildren(node,context);
		context.exit();
		return this;
	};
	With.prototype.apply = directiveApply;

	/**
	 * An `if` directive
	 */
	var If = Stencila.If = function(expr){
		this.expr = expr;
	};
	If.prototype.get = function(node){
		this.expr = node.attr('data-if');
		return this;
	};
	If.prototype.set = function(node){
		node.attr('data-if',this.expr);
		return this;
	};
	If.prototype.render = function(node,context){
		var hit = context.test(this.expr);
		if(hit){
			node.erase("data-off");
			directiveRenderChildren(node,context);
		} else {
			node.attr("data-off","true");
		}
		var next = node.next();
		while(!next.empty()){
			var expr = next.attr("data-elif");
			if(expr.length>0){
				if(hit){
					next.attr('data-off','true');
				} else {
					hit = context.test(expr);
					if(hit){
						next.erase("data-off");
						directiveRenderChildren(next,context);
					} else {
						next.attr("data-off","true");
					}
				}
			}
			else if(next.has("data-else")){
				if(hit){
					next.attr("data-off","true");
				} else {
					next.erase("data-off");
					directiveRenderChildren(next,context);
				}
				break;
			}
			else break;
			next = next.next();
		}
	};
	If.prototype.apply = directiveApply;

	/**
	 * A `for` directive
	 */
	var For = Stencila.For = function(item,items){
		this.item = item;
		this.items = items;
	};
	For.prototype.get = function(node){
		var attr = node.attr('data-for');
		var matches = attr.match(/^(\w+)\s+in\s+(.+)$/);
		this.item = matches[1];
		this.items = matches[2];
		return this;
	};
	For.prototype.set = function(node){
		node.attr('data-for',this.item+' in '+this.items);
		return this;
	};
	For.prototype.render = function(node,context){
		var more = context.begin(this.item,this.items);
		var each = node.select(['data-each']);
		if(each.empty()){
			each = node.first();
		}
		each.erase('data-off');
		while(more){
			var item = each.clone();
			node.append(item);
			directiveRender(item,context);
			more = context.next();
		}
		each.attr('data-off','true');
		return this;
	};
	For.prototype.apply = directiveApply;

	/**
	 * A stencil class
	 * 
	 * @param content HTML string or CSS selector string to element in current document. Defaults to `#content`
	 * @param context Object or string defining the conext for this stencil
	 */
	var Stencil = Stencila.Stencil = function(content,context){
		content = content || '#content';
		if(typeof content==='string'){
			if(content.substr(0,1)==='<'){
				this.dom = document.createElement('main');
				this.html(content);
			} else {
				this.dom = document.querySelector(content);
			}
		}
		else {
			this.dom = content;
		}

		context = context || window.location.url;
		this.context = new Context(context);
	};

	/**
	 * Get or set the HTML for this stencil
	 */
	Stencil.prototype.html = function(html){
		return Node.prototype.html.call(this,html);
	};

	/**
	 * Select child elements
	 * 
	 * @param  {String} selector Select child elements using a CSS selector
	 */
	Stencil.prototype.select = function(selector){
		return Node.prototype.select.call(this,selector);
	};

	/**
	 * Change the theme for this stencil
	 */
	Stencil.prototype.theme = function(theme){
		var self = this;
		require([theme+'/theme'],function(theme){
			if(self.view) self.view.close();
			self.view = new theme.NormalView(self);
		});
	};
	
	/**
	 * Render this stencil
	 */
	Stencil.prototype.render = function(context){
		if(context!==undefined){
			if(context instanceof Context) this.context = context;
			else this.context = new Context(context);
		}
		directiveRender(
			new Node(this.dom),
			this.context
		);
	};

	// http://requirejs.org/docs/api.html#config
	require.config({
		baseUrl: "/"
	});

	///////////////////////////////////////////////////////////////////////////////////////////////
	/// Initialise the Stencila component on a page. These functions create `Stencila.component`

	/**
	 * Initialise a Stencil
	 * 
	 * @param  {String} theme  Theme to load for stencil
	 * @param  {Boolean} render Should the stencil be rendered in the browser
	 */
	Stencila.stencil = function(theme,render){
		var stencil = Stencila.component = new Stencil('#content');
		stencil.theme(theme);
		if(render) stencil.render();
	};

	return Stencila;
})({});
