/*
Module Name:	stripe
Purpose:	A set of wrapper functions to access stripe.com API for programmatically creating credit card transactions
Description: A port of node-stripe (originally written by Ask Bjørn Hansen) from node.js to Wakanda by Tunc Hoscan

Original Copyright (c) 2011 Ask Bjørn Hansen
Portions Copyright (c) 2013 Tunc Hoscan

Released under the MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// This is financial transaction code!	Run only in strict mode to prevent bloopers.
"use strict";

// Make sure the querystring.js file is in the Modules directory before using this module
var querystring = require('querystring');

exports.init = function(api_key) {

	var auth = 'Basic ' + new Buffer(api_key + ":").toString('base64');
	var baseURL = 'https://api.stripe.com';

	function _request(method, path, data, callback) {

		//console.log("data", typeof data, data);

		// convert first level of deep data structures to foo[bar]=baz syntax
		Object.keys(data).forEach(function(key) {
			if (typeof data[key] === 'object' && data[key] !== null) {
				var o = data[key];
				delete data[key];
				Object.keys(o).forEach(function(k) {
					var new_key = key + "[" + k + "]";
					data[new_key] = o[k];
				});
			}
		});

		var request_data = querystring.stringify(data);

		//console.log(method, "request for", path);
		//console.log("http request", request_data);

		var fullURL = baseURL + path;
		
		var xhr = new XMLHttpRequest();

		xhr.open(method, fullURL, false);

		xhr.onreadystatechange = function() {
			// console.log('Reached the internal callback');
			var response = '';
			var err = null;
			if(typeof callback !== "function") {
				// console.log("Missing callback");
				return;
			}
			if (xhr.readyState !== 4) {
				// console.log("Ready State is not 4");
				return;
			} else {
				// console.log("Ready State is 4");
				response = JSON.parse(xhr.responseText);
				if(xhr.status !== 200) {
					err = xhr.status;
					response = { error : { message : response.error.message } };
				}
				callback(err, response);
			}
		}

		xhr.setRequestHeader('Authorization', auth);
		xhr.setRequestHeader('Accept', 'application/json');
		xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		xhr.setRequestHeader('Content-Length', request_data.length);

		xhr.send(request_data);
	}

	function post(path, data, callback) {
		_request('POST', path, data, callback);
	}

	function get(path, data, callback) {
		_request('GET', path, data, callback);
	}

	function del(path, data, callback) {
		_request('DELETE', path, data, callback);
	}

	return {
		charges: {
			create: function (data, cb) {
				post("/v1/charges", data, cb);
			},
			retrieve: function(charge_id, cb) {
				if(!(charge_id && typeof charge_id === 'string')) {
					cb("charge_id required");
				}
				get("/v1/charges/" + charge_id, {}, cb);
			},
			refund: function(charge_id, amount, cb) {
				var requestParams = {};
				if(!(charge_id && typeof charge_id === 'string')) {
					cb("charge_id required");
				}
				if (typeof amount === 'function') {
					cb = amount;
					amount = null;
				}
				if (amount) {
					requestParams.amount = amount;
				}
				post("/v1/charges/" + charge_id + "/refund", requestParams, cb);
			},
			list: function(data, cb) {
				get("/v1/charges", data, cb);
			}
		},
		customers: {
			create: function (data, cb) {
				post("/v1/customers", data, cb);
			},
			retrieve: function(customer_id, cb) {
				if (!(customer_id && typeof customer_id === 'string')) {
					return cb("customer_id required");
				}
				get("/v1/customers/" + customer_id, {}, cb);
			},
			update: function(customer_id, data, cb) {
				post("/v1/customers/" + customer_id, data, cb);
			},
			del: function(customer_id, cb) {
				del("/v1/customers/" + customer_id, {}, cb);
			},
			list: function(count, offset, cb) {
				get("/v1/customers", { count: count, offset: offset}, cb );
			},
			update_subscription: function(customer_id, data, cb) {
				post("/v1/customers/" + customer_id + '/subscription', data, cb);
			},
			cancel_subscription: function(customer_id, at_period_end, cb) {
				del("/v1/customers/" + customer_id + '/subscription', { at_period_end: at_period_end }, cb);
			}
		},
		plans: {
			create: function (data, cb) {
				post("/v1/plans", data, cb);
			},
			retrieve: function(plan_id, cb) {
				if (!(plan_id && typeof plan_id === 'string')) {
					return cb("plan_id required");
				}
				get("/v1/plans/" + plan_id, {}, cb);
			},
			del: function(plan_id, cb) {
				del("/v1/plans/" + plan_id, {}, cb);
			},
			list: function(count, offset, cb) {
				get("/v1/plans", { count: count, offset: offset}, cb );
			},
			update: function (plan_id, data, cb) {
				post("/v1/plans/" + plan_id, data, cb);
			}
		},
		invoices: {
			retrieve: function(invoice_id, cb) {
				get("/v1/invoices/" + invoice_id, {}, cb);
			},
			list: function(data, cb) {
				get("/v1/invoices", data, cb);
			},
			upcoming: function(customer_id, cb) {
				get("/v1/invoices/upcoming", { customer: customer_id }, cb);
			}
		},
		invoice_items: {
			create: function(data, cb) {
				post("/v1/invoiceitems", data, cb);
			},
			retrieve: function(invoice_item_id, cb) {
				if (!(invoice_item_id && typeof invoice_item_id === 'string')) {
					return cb("invoice_item_id required");
				}
				get("/v1/invoiceitems/" + invoice_item_id, {}, cb);
			},
			update: function(invoice_item_id, data, cb) {
				post("/v1/invoiceitems/" + invoice_item_id, data, cb);
			},
			del: function(invoice_item_id, cb) {
				del("/v1/invoiceitems/" + invoice_item_id, {}, cb);
			},
			list: function(customer_id, count, offset, cb) {
				get("/v1/invoiceitems", { customer: customer_id, count: count, offset: offset}, cb );
			}
		},
		coupons: {
			create: function (data, cb) {
				post("/v1/coupons", data, cb);
			},
			retrieve: function(coupon_id, cb) {
				if (!(coupon_id && typeof coupon_id === 'string')) {
					cb("coupon_id required");
				}
				get("/v1/coupons/" + coupon_id, {}, cb);
			},
			del: function(coupon_id, cb) {
				del("/v1/coupons/" + coupon_id, {}, cb);
			},
			list: function(count, offset, cb) {
				get("/v1/coupons", { count: count, offset: offset}, cb );
			}
		},
		token: {
			create: function (data, cb) {
				post("/v1/tokens", data, cb)
			},
			retrieve: function (token_id, cb) {
				get("/v1/tokens/" + token_id, {}, cb)
			}
		},
		events: {
			retrieve: function (token_id, cb) {
				get("/v1/events/" + token_id, {}, cb)
			},
			list: function (cb) {
				get("/v1/events/", {}, cb)
			}
		}
	};
}
