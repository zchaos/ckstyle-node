define('ckstyle/ckservice', function(require, exports, module) {
    var styler = require('./ckstyler');
    var BinaryRule = require('./browsers/BinaryRule');
    var CssChecker = styler.CssChecker;

    exports.doCompress = function(css) {
        var checker = new CssChecker(css);
        checker.prepare()
        return checker.doCompress();
    }
})

define('ckstyle/run-ckservice', function(require, exports, module) {

    var service = require('./ckservice');

    var serverRoot;

    var container, content, loading, content, trigger, close, counter, errormsg

    var TMPLS = {
        container: [
'<div class="ckstyle-container">',
'    <span class="ckstyle-close">&times;</span>',
'    <h3 class="ckstyle-header">CKStyle Service [',
'        <a href="https://github.com/wangjeaf/ckstyle-node" target="_blank">',
'            Github',
'        </a>]',
'        <span class="ckstyle-loading">Loading & Parsing <span class="ckstyle-file-count"></span> CSS files, please wait...</span>',
'        <span class="ckstyle-errormsg"></span>',
'    </h3>',
'    <div class="ckstyle-content"></div>',
'</div>',
'<div class="ckstyle-trigger">CKService</div>'
].join(''),

        data: [
'<table border=1 class="ckstyle-result-table">',
'    <thead>',
'        <tr>',
'            <th width="40%">URL</th>',
'            <th>Chars Before</th>',
'            <th>Chars After</th>',
'            <th>Delta Chars</th>',
'            <th>Delta Bytes</th>',
'            <th>Delta %</th>',
'            <th>Saved/1wPVs</th>',
'            <th>Operations</th>',
'        </tr>',
'    </thead>',
'    <tbody>',
'        {{#cssfiles}}',
'        <tr>',
'            <td> <a target="_blank" href="{{url}}">{{urlDisplay}}</a> </td>',
'            <td class="before before-{{id}}">-</td>',
'            <td class="after after-{{id}}">-</td>',
'            <td class="delta delta-{{id}}">-</td>',
'            <td class="delta-byte delta-byte-{{id}}">-</td>',
'            <td class="percent percent-{{id}}">-</td>',
'            <td class="total total-{{id}}">-</td>',
'            <td class="replacer replacer-{{id}}" data-index="{{id}}">handling...</td>',
'        <tr>',
'        {{/cssfiles}}',
'    </tbody>',
'</table>'
].join(''),

        replacer: '<a href="javascript:;" class="status-a ok">Replace CSS</a>'
    }


    var CSS = [
'.ckstyle-container {text-align: left; color: #333; width:100%;background-color:#EEE;position:fixed;top:0;right:0;z-index:2147483647;border-bottom:1px solid #DDD;box-shadow: 1px 1px 12px #AAA;opacity:0.9;}',
'.ckstyle-container .ckstyle-close {color: #666; float:right;margin-right:10px;font-size:20px;margin-top:3px;cursor:pointer;}',
'.ckstyle-container .ckstyle-header {padding:5px;margin:0;font-size:16px;line-height:22px;border-bottom:1px solid #DDD;}',
'.ckstyle-container .ckstyle-loading, .ckstyle-container .ckstyle-errormsg {display: none; padding:5px;margin:0; font-weight: normal; margin-left: 100px;}',
'.ckstyle-container .ckstyle-content {padding:5px;display:none;}',
'.ckstyle-trigger {border:1px solid #DDD; border-right: none; border-top: none; color: #666; box-shadow:1px 1px 2px #666;display:none;top:0;right:0;position:fixed;z-index:2147483647;background-color:#EEE;padding:5px;cursor:pointer;}',
'.ckstyle-result-table {border-color: #AAA; width: 100%; text-align:left;font-size:14px; border-spacing: 0;border-collapse:collapse;}',
'.ckstyle-result-table th, .ckstyle-result-table td {padding: 3px 5px; font-size: 12px !important;}'
    ].join('');

    
    var BASE = 2 * 10000 / 1024 / 1024;

    function getSavedTotalGB(delta) {
        return (delta * BASE).toFixed(4);
    }

    function getBytes(delta) {
        return (delta * 2 / 1024).toFixed(2);
    }

    function getUrl(src) {
        var a = document.createElement('a');
        a.href = src;
        return a.href;
    }

    function getOrigin(src) {
        var a = document.createElement('a');
        a.href = src;
        return a.origin;
    }

    function cut(url) {
        if (url.length > 80) {
            url = url.substring(0, 80) + '...';
        }
        return url;
    }

    function appendCss(cssText, target) {
        var style, node;
        if (/MSIE/.test(navigator.userAgent)) {
            style = doc.createStyleSheet();
            style.cssText = cssText;
            return style;
        } else {
            var style = $('<style>').attr('type', 'text/css').append(document.createTextNode(cssText));
            if (target) {
                style.insertAfter(target);
            } else {
                style.appendTo('head');
            }
            return style;
        }
    }

    function buildCssFileTable(array) {
        array.forEach(function(ele) {
            ele.urlDisplay = cut(ele.url)
        })
        content.html(Mustache.to_html(TMPLS.data, {
            cssfiles: array
        })).show();
    }

    var guid = 0;

    function getTargetCSSFiles() {
        var links = [];
        $('link').each(function(i, link) {
            if ($(link).attr('rel') != 'stylesheet') {
                return;
            }
            var url = $(link).attr('href');
            if (!url) {
                return;
            }
            if (getUrl(url).indexOf('http') != 0) {
                return;
            }
            // if (getOrigin(url) != window.location.origin) {
            //     return;
            // }
            links.push({
                url: getUrl(url),
                id: guid++,
                node: link
            });
        });
        return links;
    }

    function bindEvents() {
        close.click(function() {
            container.hide('slow');
            trigger.show('slow');
        });
        trigger.click(function() {
            trigger.hide('slow');
            container.show('slow');
        });

        container.delegate('.replacer a.ok', 'click', function() {
            var me = $(this);
            var statusA = me.hasClass('status-a');
            me.html(statusA ? 'Recover CSS' : 'Replace CSS')
                .toggleClass('status-a').toggleClass('status-b');
            var index = me.parent().data('index');
            var node = cssfiles[index].node;
            $(node).attr('rel', statusA ? 'stylesheet-bak' : 'stylesheet');
            if (statusA) {
                cssfiles[index].style = appendCss(cssfiles[index].compressed, node);
            } else {
                $(cssfiles[index].style).remove();
                delete cssfiles[index].style;
            }
        })
    }

    function loadCss(urls) {
        content.show();
        if (urls.length == 0) {
            errormsg.show().html('No css file.');
            return loading.hide();
        }
        urls.forEach(function(url) {
            loadLink(url);
        })
    }

    var loaderCounter = 0;

    function loadLink(record) {
        var index = record.id;
        $.ajax({
            url: serverRoot + '/cssfile/' + encodeURIComponent(record.url), 
            type: 'GET',
            data: {
                index: record.id
            }, 
            dataType: 'jsonp'
        }).done(function(content) {
            var index = content.index;
            var code = content.code;

            var before = code.length;
            $('.before-' + index).html(before);
            var compressed = service.doCompress(code);
            var after = compressed.length;
            record.compressed = compressed;

            var delta = before - after;
            $('.after-' + index).html(after);
            $('.delta-' + index).html(delta)
            $('.delta-byte-' + index).html(getBytes(delta) + 'KB')
            $('.percent-' + index).html(((delta / before)*100).toFixed(2) + '%')
            $('.total-' + index).html(getSavedTotalGB(delta) + ' MB')
            $('.replacer-' + index).html(TMPLS.replacer)

            loaderCounter++;

            if (loaderCounter == cssfiles.length - 1) {
                loading.hide();
                loaderCounter = 0;
            }
        }).error(function(content) {
            $('.replacer-' + index).html(TMPLS.replacerError)
        });
    }

    function initDOM() {
        appendCss(CSS);

        $(TMPLS.container).appendTo('body');

        container = $('.ckstyle-container');
        loading = $('.ckstyle-loading');
        errormsg = $('.ckstyle-errormsg');
        content = $('.ckstyle-content');
        trigger = $('.ckstyle-trigger');
        close = $('.ckstyle-close');
        counter = $('.ckstyle-file-count');
    }

    window.__cssfiles = cssfiles = null;

    function handleCSSFiles() {
        window.__cssfiles = cssfiles = getTargetCSSFiles();
        //window.urls = urls;
        buildCssFileTable(cssfiles);
        counter.html(cssfiles.length);
        loading.show();
        loadCss(cssfiles);
    }

    function init(root) {
        if (root) {
            serverRoot = root;
        }
        $('.ckstyle-container').remove();
        $('.ckstyle-trigger').remove();
        $('.ckservice-loading').remove();
        initDOM();
        bindEvents();
        handleCSSFiles();
    }

    exports.go = init;
})

seajs.use('ckstyle/run-ckservice', function(runner) {
    runner.go('http://localhost:3000');
})