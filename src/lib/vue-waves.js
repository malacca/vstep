!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.VueWaves=e():t.VueWaves=e()}(window,function(){return function(t){var e={};function n(r){if(e[r])return e[r].exports;var o=e[r]={i:r,l:!1,exports:{}};return t[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=t,n.c=e,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{configurable:!1,enumerable:!0,get:r})},n.r=function(t){Object.defineProperty(t,"__esModule",{value:!0})},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="",n(n.s=7)}([function(t,e){var n;n=function(){return this}();try{n=n||Function("return this")()||(0,eval)("this")}catch(t){"object"==typeof window&&(n=window)}t.exports=n},function(t,e,n){"use strict";(function(n){var r,o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t};!function(n,o){void 0===(r=function(){return o.apply(n)}.apply(e,[]))||(t.exports=r)}("object"===(void 0===n?"undefined":o(n))?n:void 0,function(){var t=t||{},e=document.querySelectorAll.bind(document),n=Object.prototype.toString,r="ontouchstart"in window;function a(t){var e=void 0===t?"undefined":o(t);return"function"===e||"object"===e&&!!t}function i(t){var r,o=n.call(t);return"[object String]"===o?e(t):a(t)&&/^\[object (Array|HTMLCollection|NodeList|Object)\]$/.test(o)&&t.hasOwnProperty("length")?t:a(r=t)&&r.nodeType>0?[t]:[]}function s(t){var e,n,r={top:0,left:0},a=t&&t.ownerDocument;return e=a.documentElement,"undefined"!==o(t.getBoundingClientRect)&&(r=t.getBoundingClientRect()),n=function(t){return null!==(e=t)&&e===e.window?t:9===t.nodeType&&t.defaultView;var e}(a),{top:r.top+n.pageYOffset-e.clientTop,left:r.left+n.pageXOffset-e.clientLeft}}function u(t){var e="";for(var n in t)t.hasOwnProperty(n)&&(e+=n+":"+t[n]+";");return e}var l={duration:750,delay:200,show:function(t,e,n){if(2===t.button)return!1;e=e||this;var r=document.createElement("div");r.className="waves-ripple waves-rippling",e.appendChild(r);var o=s(e),a=0,i=0;"touches"in t&&t.touches.length?(a=t.touches[0].pageY-o.top,i=t.touches[0].pageX-o.left):(a=t.pageY-o.top,i=t.pageX-o.left),i=i>=0?i:0,a=a>=0?a:0;var c="scale("+e.clientWidth/100*3+")",f="translate(0,0)";n&&(f="translate("+n.x+"px, "+n.y+"px)"),r.setAttribute("data-hold",Date.now()),r.setAttribute("data-x",i),r.setAttribute("data-y",a),r.setAttribute("data-scale",c),r.setAttribute("data-translate",f);var d={top:a+"px",left:i+"px"};r.classList.add("waves-notransition"),r.setAttribute("style",u(d)),r.classList.remove("waves-notransition"),d["-webkit-transform"]=c+" "+f,d["-moz-transform"]=c+" "+f,d["-ms-transform"]=c+" "+f,d["-o-transform"]=c+" "+f,d.transform=c+" "+f,d.opacity="1";var p="mousemove"===t.type?2500:l.duration;d["-webkit-transition-duration"]=p+"ms",d["-moz-transition-duration"]=p+"ms",d["-o-transition-duration"]=p+"ms",d["transition-duration"]=p+"ms",r.setAttribute("style",u(d))},hide:function(t,e){for(var n=(e=e||this).getElementsByClassName("waves-rippling"),o=0,a=n.length;o<a;o++)f(t,e,n[o]);r&&(e.removeEventListener("touchend",l.hide),e.removeEventListener("touchcancel",l.hide)),e.removeEventListener("mouseup",l.hide),e.removeEventListener("mouseleave",l.hide)}},c={input:function(t){var e=t.parentNode;if("i"!==e.tagName.toLowerCase()||!e.classList.contains("waves-effect")){var n=document.createElement("i");n.className=t.className+" waves-input-wrapper",t.className="waves-button-input",e.replaceChild(n,t),n.appendChild(t);var r=window.getComputedStyle(t,null),o=r.color,a=r.backgroundColor;n.setAttribute("style","color:"+o+";background:"+a),t.setAttribute("style","background-color:rgba(0,0,0,0);")}},img:function(t){var e=t.parentNode;if("i"!==e.tagName.toLowerCase()||!e.classList.contains("waves-effect")){var n=document.createElement("i");e.replaceChild(n,t),n.appendChild(t)}}};function f(t,e,n){if(n){n.classList.remove("waves-rippling");var r=n.getAttribute("data-x"),o=n.getAttribute("data-y"),a=n.getAttribute("data-scale"),i=n.getAttribute("data-translate"),s=350-(Date.now()-Number(n.getAttribute("data-hold")));s<0&&(s=0),"mousemove"===t.type&&(s=150);var c="mousemove"===t.type?2500:l.duration;setTimeout(function(){var t={top:o+"px",left:r+"px",opacity:"0","-webkit-transition-duration":c+"ms","-moz-transition-duration":c+"ms","-o-transition-duration":c+"ms","transition-duration":c+"ms","-webkit-transform":a+" "+i,"-moz-transform":a+" "+i,"-ms-transform":a+" "+i,"-o-transform":a+" "+i,transform:a+" "+i};n.setAttribute("style",u(t)),setTimeout(function(){try{e.removeChild(n)}catch(t){return!1}},c)},s)}}var d={touches:0,allowEvent:function(t){var e=!0;return/^(mousedown|mousemove)$/.test(t.type)&&d.touches&&(e=!1),e},registerEvent:function(t){var e=t.type;"touchstart"===e?d.touches+=1:/^(touchend|touchcancel)$/.test(e)&&setTimeout(function(){d.touches&&(d.touches-=1)},500)}};function p(t){var e=function(t){if(!1===d.allowEvent(t))return null;for(var e=null,n=t.target||t.srcElement;n.parentElement;){if(!(n instanceof SVGElement)&&n.classList.contains("waves-effect")){e=n;break}n=n.parentElement}return e}(t);if(null!==e){if(e.disabled||e.getAttribute("disabled")||e.classList.contains("disabled"))return;if(d.registerEvent(t),"touchstart"===t.type&&l.delay){var n=!1,o=setTimeout(function(){o=null,l.show(t,e)},l.delay),a=function(r){o&&(clearTimeout(o),o=null,l.show(t,e)),n||(n=!0,l.hide(r,e)),s()},i=function(t){o&&(clearTimeout(o),o=null),a(t),s()};e.addEventListener("touchmove",i,!1),e.addEventListener("touchend",a,!1),e.addEventListener("touchcancel",a,!1);var s=function(){e.removeEventListener("touchmove",i),e.removeEventListener("touchend",a),e.removeEventListener("touchcancel",a)}}else l.show(t,e),r&&(e.addEventListener("touchend",l.hide,!1),e.addEventListener("touchcancel",l.hide,!1)),e.addEventListener("mouseup",l.hide,!1),e.addEventListener("mouseleave",l.hide,!1)}}return t.init=function(t){var e=document.body;"duration"in(t=t||{})&&(l.duration=t.duration),"delay"in t&&(l.delay=t.delay),r&&(e.addEventListener("touchstart",p,!1),e.addEventListener("touchcancel",d.registerEvent,!1),e.addEventListener("touchend",d.registerEvent,!1)),e.addEventListener("mousedown",p,!1)},t.attach=function(t,e){var r,o;t=i(t),"[object Array]"===n.call(e)&&(e=e.join(" ")),e=e?" "+e:"";for(var a=0,s=t.length;a<s;a++)o=(r=t[a]).tagName.toLowerCase(),-1!==["input","img"].indexOf(o)&&(c[o](r),r=r.parentElement),-1===r.className.indexOf("waves-effect")&&(r.className+=" waves-effect"+e)},t.ripple=function(t,e){var n=(t=i(t)).length;if((e=e||{}).wait=e.wait||0,e.position=e.position||null,n)for(var r,o,a,u={},c=0,f={type:"mousedown",button:1},d=function(t,e){return function(){l.hide(t,e)}};c<n;c++)if(r=t[c],o=e.position||{x:r.clientWidth/2,y:r.clientHeight/2},a=s(r),u.x=a.left+o.x,u.y=a.top+o.y,f.pageX=u.x,f.pageY=u.y,l.show(f,r),e.wait>=0&&null!==e.wait){setTimeout(d({type:"mouseup",button:1},r),e.wait)}},t.calm=function(t){for(var e={type:"mouseup",button:1},n=0,r=(t=i(t)).length;n<r;n++)l.hide(e,t[n])},t.displayEffect=function(e){console.error("Waves.displayEffect() has been deprecated and will be removed in future version. Please use Waves.init() to initialize Waves effect"),t.init(e)},t})}).call(this,n(0))},function(t,e){t.exports=function(t){var e="undefined"!=typeof window&&window.location;if(!e)throw new Error("fixUrls requires window.location");if(!t||"string"!=typeof t)return t;var n=e.protocol+"//"+e.host,r=n+e.pathname.replace(/\/[^\/]*$/,"/");return t.replace(/url\s*\(((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*)\)/gi,function(t,e){var o,a=e.trim().replace(/^"(.*)"$/,function(t,e){return e}).replace(/^'(.*)'$/,function(t,e){return e});return/^(#|data:|http:\/\/|https:\/\/|file:\/\/\/|\s*$)/i.test(a)?t:(o=0===a.indexOf("//")?a:0===a.indexOf("/")?n+a:r+a.replace(/^\.\//,""),"url("+JSON.stringify(o)+")")})}},function(t,e,n){var r,o,a={},i=(r=function(){return window&&document&&document.all&&!window.atob},function(){return void 0===o&&(o=r.apply(this,arguments)),o}),s=function(t){var e={};return function(t){if("function"==typeof t)return t();if(void 0===e[t]){var n=function(t){return document.querySelector(t)}.call(this,t);if(window.HTMLIFrameElement&&n instanceof window.HTMLIFrameElement)try{n=n.contentDocument.head}catch(t){n=null}e[t]=n}return e[t]}}(),u=null,l=0,c=[],f=n(2);function d(t,e){for(var n=0;n<t.length;n++){var r=t[n],o=a[r.id];if(o){o.refs++;for(var i=0;i<o.parts.length;i++)o.parts[i](r.parts[i]);for(;i<r.parts.length;i++)o.parts.push(g(r.parts[i],e))}else{var s=[];for(i=0;i<r.parts.length;i++)s.push(g(r.parts[i],e));a[r.id]={id:r.id,refs:1,parts:s}}}}function p(t,e){for(var n=[],r={},o=0;o<t.length;o++){var a=t[o],i=e.base?a[0]+e.base:a[0],s={css:a[1],media:a[2],sourceMap:a[3]};r[i]?r[i].parts.push(s):n.push(r[i]={id:i,parts:[s]})}return n}function v(t,e){var n=s(t.insertInto);if(!n)throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");var r=c[c.length-1];if("top"===t.insertAt)r?r.nextSibling?n.insertBefore(e,r.nextSibling):n.appendChild(e):n.insertBefore(e,n.firstChild),c.push(e);else if("bottom"===t.insertAt)n.appendChild(e);else{if("object"!=typeof t.insertAt||!t.insertAt.before)throw new Error("[Style Loader]\n\n Invalid value for parameter 'insertAt' ('options.insertAt') found.\n Must be 'top', 'bottom', or Object.\n (https://github.com/webpack-contrib/style-loader#insertat)\n");var o=s(t.insertInto+" "+t.insertAt.before);n.insertBefore(e,o)}}function m(t){if(null===t.parentNode)return!1;t.parentNode.removeChild(t);var e=c.indexOf(t);e>=0&&c.splice(e,1)}function h(t){var e=document.createElement("style");return t.attrs.type="text/css",b(e,t.attrs),v(t,e),e}function b(t,e){Object.keys(e).forEach(function(n){t.setAttribute(n,e[n])})}function g(t,e){var n,r,o,a;if(e.transform&&t.css){if(!(a=e.transform(t.css)))return function(){};t.css=a}if(e.singleton){var i=l++;n=u||(u=h(e)),r=x.bind(null,n,i,!1),o=x.bind(null,n,i,!0)}else t.sourceMap&&"function"==typeof URL&&"function"==typeof URL.createObjectURL&&"function"==typeof URL.revokeObjectURL&&"function"==typeof Blob&&"function"==typeof btoa?(n=function(t){var e=document.createElement("link");return t.attrs.type="text/css",t.attrs.rel="stylesheet",b(e,t.attrs),v(t,e),e}(e),r=function(t,e,n){var r=n.css,o=n.sourceMap,a=void 0===e.convertToAbsoluteUrls&&o;(e.convertToAbsoluteUrls||a)&&(r=f(r));o&&(r+="\n/*# sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(o))))+" */");var i=new Blob([r],{type:"text/css"}),s=t.href;t.href=URL.createObjectURL(i),s&&URL.revokeObjectURL(s)}.bind(null,n,e),o=function(){m(n),n.href&&URL.revokeObjectURL(n.href)}):(n=h(e),r=function(t,e){var n=e.css,r=e.media;r&&t.setAttribute("media",r);if(t.styleSheet)t.styleSheet.cssText=n;else{for(;t.firstChild;)t.removeChild(t.firstChild);t.appendChild(document.createTextNode(n))}}.bind(null,n),o=function(){m(n)});return r(t),function(e){if(e){if(e.css===t.css&&e.media===t.media&&e.sourceMap===t.sourceMap)return;r(t=e)}else o()}}t.exports=function(t,e){if("undefined"!=typeof DEBUG&&DEBUG&&"object"!=typeof document)throw new Error("The style-loader cannot be used in a non-browser environment");(e=e||{}).attrs="object"==typeof e.attrs?e.attrs:{},e.singleton||"boolean"==typeof e.singleton||(e.singleton=i()),e.insertInto||(e.insertInto="head"),e.insertAt||(e.insertAt="bottom");var n=p(t,e);return d(n,e),function(t){for(var r=[],o=0;o<n.length;o++){var i=n[o];(s=a[i.id]).refs--,r.push(s)}t&&d(p(t,e),e);for(o=0;o<r.length;o++){var s;if(0===(s=r[o]).refs){for(var u=0;u<s.parts.length;u++)s.parts[u]();delete a[s.id]}}}};var w,y=(w=[],function(t,e){return w[t]=e,w.filter(Boolean).join("\n")});function x(t,e,n,r){var o=n?"":r.css;if(t.styleSheet)t.styleSheet.cssText=y(e,o);else{var a=document.createTextNode(o),i=t.childNodes;i[e]&&t.removeChild(i[e]),i.length?t.insertBefore(a,i[e]):t.appendChild(a)}}},function(t,e){t.exports=function(t){var e=[];return e.toString=function(){return this.map(function(e){var n=function(t,e){var n=t[1]||"",r=t[3];if(!r)return n;if(e&&"function"==typeof btoa){var o=(i=r,"/*# sourceMappingURL=data:application/json;charset=utf-8;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(i))))+" */"),a=r.sources.map(function(t){return"/*# sourceURL="+r.sourceRoot+t+" */"});return[n].concat(a).concat([o]).join("\n")}var i;return[n].join("\n")}(e,t);return e[2]?"@media "+e[2]+"{"+n+"}":n}).join("")},e.i=function(t,n){"string"==typeof t&&(t=[[null,t,""]]);for(var r={},o=0;o<this.length;o++){var a=this[o][0];"number"==typeof a&&(r[a]=!0)}for(o=0;o<t.length;o++){var i=t[o];"number"==typeof i[0]&&r[i[0]]||(n&&!i[2]?i[2]=n:n&&(i[2]="("+i[2]+") and ("+n+")"),e.push(i))}},e}},function(t,e,n){(t.exports=n(4)(!1)).push([t.i,"/*!\n * Waves v0.7.5\n * http://fian.my.id/Waves \n * \n * Copyright 2014-2016 Alfiana E. Sibuea and other contributors \n * Released under the MIT license \n * https://github.com/fians/Waves/blob/master/LICENSE \n */.waves-effect{position:relative;cursor:pointer;display:inline-block;overflow:hidden;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}.waves-effect .waves-ripple{position:absolute;border-radius:50%;width:100px;height:100px;margin-top:-50px;margin-left:-50px;opacity:0;background:rgba(0,0,0,.2);background:-webkit-radial-gradient(rgba(0,0,0,.2) 0,rgba(0,0,0,.3) 40%,rgba(0,0,0,.4) 50%,rgba(0,0,0,.5) 60%,hsla(0,0%,100%,0) 70%);background:-o-radial-gradient(rgba(0,0,0,.2) 0,rgba(0,0,0,.3) 40%,rgba(0,0,0,.4) 50%,rgba(0,0,0,.5) 60%,hsla(0,0%,100%,0) 70%);background:-moz-radial-gradient(rgba(0,0,0,.2) 0,rgba(0,0,0,.3) 40%,rgba(0,0,0,.4) 50%,rgba(0,0,0,.5) 60%,hsla(0,0%,100%,0) 70%);background:radial-gradient(rgba(0,0,0,.2) 0,rgba(0,0,0,.3) 40%,rgba(0,0,0,.4) 50%,rgba(0,0,0,.5) 60%,hsla(0,0%,100%,0) 70%);-webkit-transition:all .5s ease-out;-moz-transition:all .5s ease-out;-o-transition:all .5s ease-out;transition:all .5s ease-out;-webkit-transition-property:-webkit-transform,opacity;-moz-transition-property:-moz-transform,opacity;-o-transition-property:-o-transform,opacity;transition-property:transform,opacity;-webkit-transform:scale(0) translate(0);-moz-transform:scale(0) translate(0);-ms-transform:scale(0) translate(0);-o-transform:scale(0) translate(0);transform:scale(0) translate(0);pointer-events:none}.waves-effect.waves-light .waves-ripple{background:hsla(0,0%,100%,.4);background:-webkit-radial-gradient(hsla(0,0%,100%,.2) 0,hsla(0,0%,100%,.3) 40%,hsla(0,0%,100%,.4) 50%,hsla(0,0%,100%,.5) 60%,hsla(0,0%,100%,0) 70%);background:-o-radial-gradient(hsla(0,0%,100%,.2) 0,hsla(0,0%,100%,.3) 40%,hsla(0,0%,100%,.4) 50%,hsla(0,0%,100%,.5) 60%,hsla(0,0%,100%,0) 70%);background:-moz-radial-gradient(hsla(0,0%,100%,.2) 0,hsla(0,0%,100%,.3) 40%,hsla(0,0%,100%,.4) 50%,hsla(0,0%,100%,.5) 60%,hsla(0,0%,100%,0) 70%);background:radial-gradient(hsla(0,0%,100%,.2) 0,hsla(0,0%,100%,.3) 40%,hsla(0,0%,100%,.4) 50%,hsla(0,0%,100%,.5) 60%,hsla(0,0%,100%,0) 70%)}.waves-effect.waves-classic .waves-ripple{background:rgba(0,0,0,.2)}.waves-effect.waves-classic.waves-light .waves-ripple{background:hsla(0,0%,100%,.4)}.waves-notransition{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;transition:none!important}.waves-button,.waves-circle{-webkit-transform:translateZ(0);-moz-transform:translateZ(0);-ms-transform:translateZ(0);-o-transform:translateZ(0);transform:translateZ(0);-webkit-mask-image:-webkit-radial-gradient(circle,#fff 100%,#000 0)}.waves-button,.waves-button-input,.waves-button:hover,.waves-button:visited{white-space:nowrap;vertical-align:middle;cursor:pointer;border:none;outline:none;color:inherit;background-color:transparent;font-size:1em;line-height:1em;text-align:center;text-decoration:none;z-index:1}.waves-button{padding:.85em 1.1em;border-radius:.2em}.waves-button-input{margin:0;padding:.85em 1.1em}.waves-input-wrapper{border-radius:.2em;vertical-align:bottom}.waves-input-wrapper.waves-button{padding:0}.waves-input-wrapper .waves-button-input{position:relative;top:0;left:0;z-index:1}.waves-circle{text-align:center;width:2.5em;height:2.5em;line-height:2.5em;border-radius:50%}.waves-float{-webkit-mask-image:none;-webkit-box-shadow:0 1px 1.5px 1px rgba(0,0,0,.12);box-shadow:0 1px 1.5px 1px rgba(0,0,0,.12);-webkit-transition:all .3s;-moz-transition:all .3s;-o-transition:all .3s;transition:all .3s}.waves-float:active{-webkit-box-shadow:0 8px 20px 1px rgba(0,0,0,.3);box-shadow:0 8px 20px 1px rgba(0,0,0,.3)}.waves-block{display:block}",""])},function(t,e,n){var r=n(5);"string"==typeof r&&(r=[[t.i,r,""]]);var o={hmr:!0,transform:void 0,insertInto:void 0};n(3)(r,o);r.locals&&(t.exports=r.locals)},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),n(6);var r,o=n(1),a=(r=o)&&r.__esModule?r:{default:r};e.default={install:function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{name:"waves"};t.directive(e.name,{inserted:function(t,e){var n=["button","circle","block","float","light","classic"].filter(function(t){return e.modifiers[t]}).map(function(t){return"waves-"+t});a.default.attach(t,n)}}),t.mixin({created:function(){a.default.init(e)}})}}}])});