(function() {
    var _DOC = document;

    // 展示区域
    var markdDisplay;

    // 第一个展示的 doc
    var firstDoc;

    // 加载 markdown 文件的 URL 前缀
    var staticUrl = (() => {
        const scripts = _DOC.getElementsByTagName('script'), len = scripts.length;
        for (let i=0, s, u; i<len; i++) {
            s = scripts[i];
            u = s.getAttribute('data-main');
            if (u) {
                firstDoc = s.getAttribute('static-default');
                markdDisplay = _DOC.querySelector(s.getAttribute('static-display'));
                return s.getAttribute('static-url');
            }
        }
        return '';
    })();

    var baseUrl = 'https://cdn.jsdelivr.net/',
        markedVer = '0.8.0',
        prismVer = '1.19.0';

    requirejs.config({
        baseUrl: baseUrl,
        paths: {
            marked: 'npm/marked@'+markedVer+'/marked.min',
            prismjs: 'npm/prismjs@'+prismVer+'/prism.min'
        },
        onNodeCreated: function(node, config, module, path) {
            if (module === 'prismjs') {
                node.setAttribute('data-manual', '');
            } 
        }
    });

    var PrismComponents, 
        PrismComponenting,
        PrismComponentsCb = [];
    function getPrismComponents(cb){
        if (PrismComponents) {
            cb(PrismComponents);
            return;
        }
        if (PrismComponenting) {
            PrismComponentsCb.push(cb);
            return;
        }
        PrismComponenting = true;
        fetch(baseUrl + 'npm/prismjs@'+prismVer+'/components.json').then(function(r){
            return r.json()
        }).then(function(res) {
            var components = {}, alias = {}, item, k, preCb;
            for (k in res.languages) {
                item = res.languages[k];
                components[k] = item.require ? (Array.isArray(item.require) ? item.require : [item.require]) : null;
                if (!item.alias) {
                    continue;
                }
                if (Array.isArray(item.alias)) {
                    item.alias.forEach(function(a){
                        alias[a] = k
                    })
                } else {
                    alias[item.alias] = k
                }
            }
            for (k in alias) {
                if (!(k in components)) {
                    components[k] = alias[k];
                }
            }
            PrismComponents = components;
            while(preCb = PrismComponentsCb.shift()) {
                preCb(PrismComponents);
            }
            cb(PrismComponents);
        })
    }

    function isHaveLang(lang) {
        return lang in Prism.languages && typeof Prism.languages[lang] === 'object'
    }

    function langUrl(lang) {
        return baseUrl + 'npm/prismjs@'+prismVer+'/components/prism-'+lang+'.min.js';
    }

    function normalize(name) {
        var index = name.indexOf('?');
        return index > -1 ? name.substr(0, index) : name;
    }

    define('prism', {
        normalize: normalize,
        load: function(name, req, onLoad, config) {
            if (isHaveLang(name)) {
                onLoad(true);
                return;
            }
            getPrismComponents(function(components) {
                if (!(name in components)) {
                    onLoad(false);
                    return;
                }
                var load = function(){
                    req([langUrl(name)], function() {
                        onLoad(true)
                    }, function() {
                        onLoad(false)
                    });
                };
                var deps = components[name];
                if (deps && typeof deps === 'string') {
                    deps = components[deps];
                }
                if (deps) {
                    req(deps.map(langUrl), load, function() {
                        onLoad(false)
                    })
                } else {
                    load();
                }
            })
        }
    });

    function resolveLang(item, cb){
        var lang = item[0], code = item[1];
        require(['prism!'+lang], function(ok) {
            try {
                if (ok) {
                    code = Prism.highlight(code, Prism.languages[lang], lang);
                }
            } catch (e) {
                //do
            }
            cb(lang, code);
        })
    }
    function resolveCodes(htm, markedCodes, callabck) {
        var resolved = [];
        var replace = function(){
            resolved.forEach(function(item, index) {
                var lang = item[0];
                lang = ' class="language-' + lang + '"';
                htm = htm.replace(
                    '___Marked_Code_PlaceHolder__$'+index, 
                    '<pre' + lang + '><code' + lang + '>' + item[1]  + '</code></pre>'
                )
            });
            callabck(htm);
        };
        var resolve = function() {
            var item = markedCodes.shift();
            if (!item) {
                replace();
            } else {
                resolveLang(item, function(lang, code) {
                    resolved.push([lang, code]);
                    resolve();
                })
            }
        };
        resolve();
    }
    define('md', {
        normalize: normalize,
        load: function(name, req, onLoad, config) {
            req(['marked', 'prismjs'], function(Marked) {
                var markedCodes = [];
                var renderer = new Marked.Renderer();
                renderer.code = function (text, lang) {
                    var len = markedCodes.length;
                    markedCodes.push([lang||"markup", text]);
                    return '___Marked_Code_PlaceHolder__$' + len + "\n";
                };
                fetch(staticUrl + '/'+name+'.md').then(function(res) {
                    return res.text();
                }).then(function(md) {
                    var html = Marked(md, {renderer: renderer});
                    resolveCodes(html, markedCodes, onLoad);
                })
            });
        }
    });

    function openMd(name) {
        markdDisplay.style.opacity = '.6';
        require(['md!'+name], function(htm) {
            markdDisplay.innerHTML = htm;
            markdDisplay.style.opacity = '';
        })
    }

    var currentElm;
    function addActiveClass(elm) {
        if (currentElm) {
            currentElm.className = currentElm.className.split(' ').filter(function(c) {
                return c != 'active'
            }).join(' ')
        }
        elm.className = elm.className + (elm.className === '' ? '' : ' ') + 'active';
        currentElm = elm;
    };

    // 执行
    var matches = markdDisplay ? _DOC.querySelectorAll('[doc]') : [],
        len = matches.length;
    if (!len) {
        return;
    }
    var hash = location.hash, hashMatch, fistElm, hashElm;
    hash = hash ? hash.substr(1) : null;
    for (var k=0; k<len; k++) {
        (function(i) {
            var elm = matches[i],
                doc = elm.getAttribute('doc');
            elm.addEventListener('click', function() {
                location.hash = doc;
                addActiveClass(this);
                openMd(doc);
            });
            if (!hashMatch && hash && doc === hash) {
                hashMatch = true;
                hashElm = elm;
            }
            if (firstDoc && firstDoc === doc) {
                fistElm = elm;
            }
        })(k);
    }
    if (hashMatch) {
        addActiveClass(hashElm);
        openMd(hash);
    } else if (fistElm) {
        addActiveClass(fistElm);
        openMd(firstDoc);
    }
})();