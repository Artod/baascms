;(function(window, document, _, JSON, $, undefined) {
    window.BaasCMS = (window.BaasCMS || {});
    var BaasCMS = window.BaasCMS;

    BaasCMS.Router = (window.Path || function() {
        console.error('Requires Pathjs library.');
    });
    
    BaasCMS.cons = {
        formFieldTypes: ['text', 'number', 'hidden', 'textarea', 'checkbox', 'select', 'google drive image', 'google drive file'],
        categoriesSelect: ['id', 'parent_id', 'name', 'pattern_name', 'count', 'icon']
    };
    
    BaasCMS.utils = {
        collectDataForm: function($form) {
            var data = {};

            var serAr = new Array();

            $form.find('input, textarea, select').each(function() {
                var $this = $(this);

                if ( ( $this.is(':checkbox') || $this.is(':radio') ) &&  !$this.is(':checked') ) {
                    return;
                }

                var val = $this.val();

                serAr.push({
                    name: $this.attr('name'),
                    value: ($this.attr('type') === 'number' ? parseFloat( val.replace(',', '.') ) : val)
                });
            });

            for (var i in serAr) {
                if (typeof serAr[i].name === 'undefined') {
                    continue;
                }

                data[serAr[i].name] = serAr[i].value;
            }

            return data;

            var data = {};

            var serAr = $form.serializeArray();

            _.each(serAr, function(el) {
                data[el.name] = el.value;
            });

            return data;
        }
    };
    
    BaasCMS.cookie = {
        get: function(name) {
            var matches = document.cookie.match(new RegExp(
                    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
                ));

                return matches ? decodeURIComponent(matches[1]) : undefined;
        },
        set: function(name, value, props) {
            props = props || {};

            var exp = props.expires;
            if (typeof exp == 'number' && exp) {
                var d = new Date();
                d.setTime(d.getTime() + exp * 1000);
                exp = props.expires = d;
            }

            if (exp && exp.toUTCString) {
                props.expires = exp.toUTCString();
            }

            value = encodeURIComponent(value);

            var updatedCookie = name + '=' + value;
            for (var propName in props) {
                updatedCookie += '; ' + propName;
                var propValue = props[propName];
                if (propValue !== true) {
                    updatedCookie += '=' + propValue;
                }
            }

            document.cookie = updatedCookie;
        },
        del: function(name) {
            this.set(name, null, {
            expires: -1
            });
        }
    };

    BaasCMS.widgets = _.extend( (BaasCMS.widgets || {}), {
        Categories: (function() {
            var Categories = function(options) {
                var options = options || {};

                this.opts = _.extend({
                    elementSelector: '',
                    templateWrap: 'template-baascms-category-index',
                    templateElement: 'template-baascms-category-element',
                    select: BaasCMS.cons.categoriesSelect,
                    where: null,
                    beforeQuery: function() {},
                    afterQuery: function() {},
                    beforeRender: function() {},
                    afterRender: function() {},
                    onEnter: function() {}
                }, options);

                this.currentCID = '';

                this.$el = $();

                /*$(BaasCMS.widgets).on('reload', function(e, sender) {
                    if (that === sender) return;

                    that.reload();
                });*/

                $(BaasCMS.widgets).on('route', function(e, route, params) {
                    that.opts.onEnter.call(that, params['cid']);
                });

                var that = this;

                $(function() {
                    that.$el = $(that.opts.elementSelector);
                    that.load();
                });
            };

            Categories.prototype = {
                load: function() {
                    if (this.opts.beforeQuery.call(this) === false) {
                        return;
                    }

                    var that = this;

                    this.get().done(function(data) {
                        if (that.opts.afterQuery.call(that, data) === false || that.opts.beforeRender.call(that, data) === false) {
                            return;
                        }

                        that.render(data);

                        that.opts.afterRender.call(that, data);
                    });
                },
                get: function() {
                    var param = {
                        select: this.opts.select
                    };

                    if (this.opts.where) { // for caching query
                        param.where = this.opts.where;
                    }

                    return BaasCMS.adapter.all('Category', param);
                },
                render: function(dataCategories) {
                    var templateWrap = _.template( $('#' + this.opts.templateWrap).html() || 'Need to create template with id <i>' + this.opts.templateWrap + '</i>.' ),
                        templateElement = _.template( $('#' + this.opts.templateElement).html() || 'Need to create template with id <i>' + this.opts.templateElement + '</i>.' ),
                        that = this;

                    var recurs = function(children, level) {
                        var out = '';

                        _.each(children, function(category, i) {
                            var subcats = _.where(dataCategories, {parent_id: category.id}),
                                htmlSubcats = (subcats.length ? templateWrap({
                                    htmlCategories: recurs(subcats, level + 1)
                                }) : '');

                            out += templateElement({
                                category: category,
                                level: level,
                                htmlSubcats: htmlSubcats,
                                currentCID: that.currentCID
                            });
                        });

                        return out;
                    };

                    this.$el.html( templateWrap({
                        htmlCategories: recurs( _.where(dataCategories, {parent_id: ''}), 0 )
                    }) );
                }
            };

            return Categories;
        })(),
        Category: (function() {
            var Category = function(options) {
                this.opts = _.extend({
                    elementSelector: '',
                    template: 'template-baascms-category',
                    cid: 0,
                    autoLoad: true,
                    beforeQuery: function() {},
                    afterQuery: function() {},
                    beforeRender: function() {},
                    afterRender: function() {},
                }, options);
                
                var that = this;
                
                if (that.opts.autoLoad) {
                    that.load();
                }
            };

            Category.prototype = {
                load: function(params) {
                    var that = this;

                    this.get().done(function(data) {
                        that.render(data);
                    });
                },
                get: function() {
                    if (this.opts.beforeQuery.call(this) === false) {
                        return;
                    }
                    
                    var that = this;
                    
                    return $.when(
                        BaasCMS.adapter.getById('Category', this.opts.cid),
                        BaasCMS.adapter.all('Category', {
                            select: BaasCMS.cons.categoriesSelect
                        })
                    ).then(function(dataCategory, dataCategories) {
                        var data = {
                            category: dataCategory,
                            children: _.where(dataCategories, {parent_id: that.opts.cid})
                        };
                        
                        that.opts.afterQuery.call(this, data);
                        
                        return data;
                    });
                },
                render: function(data, justReturn) {
                    if (this.opts.beforeRender.call(this, data) === false) {
                        return;
                    }
                    
                    var template = _.template(
                        $('#' + this.opts.template).html() ||
                        'Need to create template with id <i>' + this.opts.template + '</i>.'
                    );

                    var html = template({
                        cid: this.opts.cid,
                        category: data.category,
                        children: data.children
                    });

                    if (justReturn) {
                        return html;
                    }

                    this.$el.html(html);
                    
                    this.opts.afterRender.call(this, data)
                }
            };
            
            return Category;
        })(),
        Items: (function() {
            var Items = function(options) {
                var options = options || {},
                    patternName = options.patternName,
                    dasherized = _.str.dasherize(patternName);

                this.opts = _.extend({
                    patternName: '',
                    elementSelector: '',
                    templateWrap: 'template-baascms-items' + dasherized + '-wrap',
                    templateElement: 'template-baascms-items' + dasherized + '-element',
                    withoutCache: false,
                    select: null,
                    where: {},                    
                    sort: '-createdAt',                    
                    limit: 5,    
                    skip: 0,
                    autoLoad: true,
                    beforeQuery: function() {},
                    afterQuery: function() {},
                    beforeRender: function() {},
                    afterRender: function() {}
                }, options);

                var that = this;

                this.$el = $();
                $(function() {
                    that.$el = $(that.opts.elementSelector);

                    if (that.opts.autoLoad) {
                        that.load();
                    }
                });
            };

            Items.prototype = {
                load: function(params) {
                    var that = this;

                    this.get().done(function(data) {
                        that.render(data);
                    });
                },
                get: function(data) {
                    if (this.opts.beforeQuery.call(this, data) === false) {
                        return;
                    }

                    var sort = this.opts.sort,
                        //skip = this.opts.perPage * Math.abs( parseInt(this.opts.page) - 1 ),
                        that = this;

                    return $.when(
                        BaasCMS.adapter.all('Pattern'), // for cache
                        BaasCMS.adapter.all(this.opts.patternName, {
                            withoutCache: this.opts.withoutCache,
                            select: this.opts.select,
                            where: this.opts.where,
                            limit: this.opts.limit,
                            skip: this.opts.skip,
                            order: sort
                        })
                    ).then(function(dataPatterns, dataItems) {
                        var data = {
                            items: dataItems,
                            pattern: _.findWhere(dataPatterns, {name: that.opts.patternName})
                        };

                        that.opts.afterQuery.call(that, data);

                        return data;
                    });
                },
                render: function(data, justReturn) {
                    if (this.opts.beforeRender.call(this, data) === false) {
                        return;
                    }

                    var that = this;
                    var compileTemplate = function(type) {
                        var templateName = that.opts['template' + _.str.classify(type)],
                            template = $('#' + templateName).html() ||
                                $('#template-baascms-items-' + type).html() ||
                                'Need to create template with id <i>' + templateName + '</i>.';

                        return _.template(template);
                    };

                    var templateElement = compileTemplate('element'),
                        templateWrap = compileTemplate('wrap'),
                        htmlElements = '';

                    _.each(data.items, function(item) {
                        htmlElements += templateElement({
                            opts: that.opts,
                            item: item,
                            pattern: data.pattern
                        });
                    });

                    if (justReturn === 'el') {
                        return htmlElements;
                    }                    

                    var html = templateWrap({
                        opts: that.opts,
                        data: data,
                        pattern: data.pattern,
                        htmlElements: htmlElements
                    });

                    if (justReturn) {
                        return html;
                    }

                    this.$el.html(html);

                    this.opts.afterRender.call(this, data);
                }
            };

            return Items;
        })(),
        Main: (function() {
            var Main = function(options) {
                var options = options || {};

                this.opts = _.extend({
                    elementSelector: '',
                    routes: {},
                    category: {},
                    items: {},
                    beforeHome: function() {},
                    afterHome: function() {},
                }, options);

                this.routes = _.extend({}, this.opts.routes, {
                    '#/baascms/category/:cid(/page/:page)(/sort/:sort)': this.categoryOrItems,
                    '#/baascms/category/:cid/item/:aid': this.item
                });
               
                this.currentRoute = null;
                this.itemsWidgets = {};

                var that = this;

                this.$el = $();
                
                $(function() {
                    that.$el = $(that.opts.elementSelector);
                    that.initRoutes();
                });
            };

            Main.prototype = {
                load: function() {
                    if (this.currentRoute && typeof this.currentRoute.run === 'function') {
                        this.currentRoute.run();
                    }
                },
                initRoutes: function() {
                    var that = this;

                    _.each(this.routes, function(action, route) {
                        BaasCMS.Router.map(route).to(function() {
                            $(BaasCMS.widgets).trigger('route', [route, this.params]);

                            if ( _.isFunction(action) ) {
                                action.call(that, this.params);
                                that.currentRoute = this;
                            }
                        });
                    });
                    
                    Path.root('#/baascms');
                    
                    BaasCMS.Router.rescue(function() {
                        that.home();
                    });

                    BaasCMS.Router.listen();
                },
                startWaiting: function() {
                    var waitfor = _.uniqueId('waitfor_');

                    this.$el.data('waitfor', waitfor);

                    return waitfor;
                },
                fill: function(uid, html) {
                    var waitfor = this.$el.data('waitfor');

                    if (waitfor && waitfor !== uid) {
                        return;
                    }

                    this.$el.html(html);
                },
                home: function() {
                    if (this.opts.beforeHome.call(this) === false) {
                        return false;
                    }
                    
                    this.startWaiting();
                    
                    this.$el.html( _.template( $('#template-baascms-home').html(), {} ) );                   
                    
                    this.opts.afterHome.call(this);
                },
                newItemsWidget: function(patternName, params) {
                    var page = parseInt(params['page']) || 1;
                    
                    var widget = new BaasCMS.widgets.Items( _.extend({
                            patternName: patternName,
                            elementSelector: this.opts.elementSelector,
                            withoutCache: true,
                            autoLoad: false
                        }, this.opts.items[patternName]
                    ) );                    
                    
                    widget.opts.skip = (page - 1) * widget.opts.limit;
                    
                    if (params['sort']) {
                        widget.opts.sort = params['sort'];
                    }
                    
                    _.extend(widget.opts.where, {
                        category_id: params['cid']
                    });                    

                    return widget;
                },
                categoryOrItems: function(params) {
                    var that = this,
                        cid = params['cid'],
                        waitfor = this.startWaiting();
                        
                    var categoryWidget = new BaasCMS.widgets.Category( _.extend({
                        elementSelector: this.opts.elementSelector,
                        cid: cid,
                        autoLoad: false
                    }, this.opts.category) );

                    categoryWidget.get().done(function(data) { //data = {category: {}, children: []}
                        if (!data.category.pattern_name) {
                            that.fill( waitfor, categoryWidget.render(data, true) );

                            categoryWidget.opts.afterRender.call(categoryWidget, data);
                            
                            return;
                        }

                        var itemsWidget = that.newItemsWidget(data.category.pattern_name, params),
                            prevData = data;

                        itemsWidget.get().done(function(itemsData) {
                            var data = _.extend({
                                page: parseInt(params['page']) || 1,
                                pages: prevData.category.count ? Math.ceil( prevData.category.count/(itemsWidget.opts.limit || 1) ) : 1
                            }, itemsData, prevData);
                            
                            that.fill( waitfor, itemsWidget.render(data, true) );
                            
                            itemsWidget.opts.afterRender.call(itemsWidget, data);
                        });
                    });
                },
                /* ! */ item: function(params) {
                    var dataCategory, dataPattern,
                        cid = params['cid'],
                        aid = params['aid'];

                    BaasCMS.adapter.getById('Category', cid).then(function(data) {
                        dataCategory = data;

                        if (!dataCategory || !dataCategory.id) {
                            BaasCMS.Widgets.main.$el.html('Such a category was not found.');
                            return;
                        }

                        return $.when(
                            BaasCMS.adapter.first('Pattern', {
                                where: {name: dataCategory.pattern_name}
                            }),
                            BaasCMS.adapter.getById(dataCategory.pattern_name, aid, {
                                withoutCache: true
                            })
                        );
                    }).done(function(dataPattern, dataArticle) {
                        if (!dataPattern || !dataArticle) {
                            return;
                        }

                        if (!dataPattern.name) {
                            BaasCMS.Widgets.main.$el.html('There are no pattern for this category.');
                            return;
                        }

                        if (!dataArticle.id) {
                            BaasCMS.Widgets.main.$el.html('Article was not found.');
                            return;
                        }

                        dataPattern.pattern.push({
                            name: 'category_id',
                            type: 'hidden'
                        });

                        var template = _.str.trim( $('#template-baascms' + _.str.dasherize(dataPattern.name) + '-form').html() ) || $('#template-baascms-form').html();

                        BaasCMS.Widgets.main.$el.html( _.template( template, {
                            header: 'Edit ' + _.str.humanize(dataPattern.name),
                            button: 'Update',
                            form: BaasCMS.Admin.generateForm(dataArticle, dataPattern.pattern)
                        } ) );

                        var $form = BaasCMS.Widgets.main.$el.find('form');
                        $form.on('submit', function() {
                            var data = BaasCMS.Admin.collectDataForm($form);

                            BaasCMS.adapter.save(dataPattern.name, data).done(function(object) {

                            });

                            return false;
                        });
                    });
                }
            };

            return Main;
        })(),
        /* ! */Breadcrumbs: function() {}
    });

    BaasCMS.adapters = (BaasCMS.adapters || {});
    BaasCMS.Adapter = (function() {
        var _dummy = function() {
            console.error('Adapter does not support this method.');
        };

        function Adapter(adapter, opts) {
            this.opts = _.extend({
                cmsOpts: {},
                onStart: function() {},
                onComplete: function() {}
            }, opts);

            this._cache = {};

            this._countCurrentQueries = 0;
            this.busy = false;

            this._concurrents = {};

            if (typeof adapter === 'function') {
                var adapter = new adapter(opts.cmsOpts);
                _.extend(this, adapter);
            }
        }

        Adapter.prototype = {
            _query: _dummy,
            _count: _dummy,
            _save: _dummy,
            _del: _dummy,
            onStart: function() {
//this._cache = {};
                this._countCurrentQueries++;
                this.busy = true;

                var queryUid = _.uniqueId('baascms_query_');
                this.opts.onStart(queryUid);

                return queryUid;
            },
            onComplete: function(queryUid) {
                this._countCurrentQueries--;
                this.opts.onComplete(queryUid);

                var that = this;

                setTimeout(function() {
                    if (that._countCurrentQueries === 0) {
                        that.busy = false;
                    }
                }, 1);
            },
            query: function(modelName, idOrOpts, opts) {
                var id = ( _.isString(idOrOpts) ? idOrOpts : '' ),
                    opts = ( _.isObject(idOrOpts) ? idOrOpts : (opts || {}) ),
                    deferred = $.Deferred(),
                    cacheKey = 'query_' + id + '_' + JSON.stringify(opts),
                    concurrentsKey = modelName + '_' + cacheKey,
                    that = this;

                if ( opts.withoutCache === true || !this._cache[modelName] || _.isUndefined(this._cache[modelName][cacheKey]) ) {
                    if (this._concurrents[concurrentsKey]) {
console.log('Concurrents ' + cacheKey);
                       return this._concurrents[concurrentsKey].promise();
                    }

                    this._concurrents[concurrentsKey] = deferred;

                    var queryUid = this.onStart();

                    var query = opts.count ? this._count(modelName, opts, deferred) : this._query(modelName, id, opts, deferred);

                    query.done(function(data) {
                        that._cache[modelName] = that._cache[modelName] || {};
                        that._cache[modelName][cacheKey] = JSON.stringify(data);
                    }).always(function() {
                        delete that._concurrents[concurrentsKey];
                        that.onComplete(queryUid);
                    });

                } else {
                    deferred.resolve( JSON.parse(this._cache[modelName][cacheKey]) );
console.log('Get cache '+ modelName + ': ' + cacheKey);
                }

                return deferred.promise();
            },
            getById: function(modelName, id, opts) {
                var opts = opts || {};
                opts.first = true;

                return this.query(modelName, id, opts);
            },
            first: function(modelName, opts) {
                var opts = opts || {};
                opts.first = true;

                return this.query(modelName, opts);
            },
            all: function(modelName, opts) {
                return this.query(modelName, opts);
            },
            count: function(modelName, opts) {
                var opts = opts || {};
                opts.count = true;

                return this.query(modelName, opts);
            },
            save: function(modelName, opts) {
                var deferred = $.Deferred(),
                    opts = opts || {},
                    that = this;

                var queryUid = this.onStart();

                return this._save(modelName, opts, deferred).done(function(id) {
                    delete that._cache[modelName];
                }).always(function() {
                    that.onComplete(queryUid);
                });
            },
            del: function(modelName, ids) {
                var ids = ids || '',
                    deferred = $.Deferred(),
                    that = this;

                ids = _.isArray(ids) ? ids : [ids];

                var queryUid = this.onStart();

                return this._del(modelName, ids, deferred).done(function() {
                    delete that._cache[modelName];
                }).always(function() {
                    that.onComplete(queryUid);
                });
            },
            delCategory: function(cid) {
                var cids = [],
                    patternNames = [],
                    that = this;

                return $.when(
                    that.all('Category', {
                        withoutCache: true,
                        select: ['id', 'name', 'parent_id']
                    }),
                    that.all('Pattern', {
                        withoutCache: true,
                        select: ['name']
                    })
                ).then(function(dataCategories, dataPatterns) {
                    var descendants = [],
                        generation = 0,
                        recurs = function(categories, generation) {
                            _.each(categories, function(category) {
                                descendants.push(category);

                                var children = _.where(dataCategories, {parent_id: category.id});
                                if (children.length) {
                                    recurs(children, generation + 1);
                                }
                            });
                        };

                    recurs( _.where(dataCategories, {parent_id: cid}), '', generation );

                    cids = _.pluck(descendants, 'id');
                    cids.push(cid);

                    patternNames = _.pluck(dataPatterns, 'name');
                    var patternDeferreds = [];

                    _.each(patternNames, function(patternName) {
                        patternDeferreds.push( that.all(patternName, {
                            withoutCache: true,
                            select: ['id'],
                            where: {
                                'category_id': {
                                    '$in': cids
                                }
                            }
                        }) );
                    });

                    return $.when.apply(this, patternDeferreds);
                }).then(function() {
                    var articleDeferreds = [];

                    _.each(arguments, function(dataArticle, i) {
                        var aids = _.pluck(dataArticle, 'id');

                        articleDeferreds.push( that.del(patternNames[i], aids) );
                    });

                    return $.when.apply(this, articleDeferreds);
                }).then(function() {
                    return that.del('Category', cids);
                });
            },
            delItem: function(patternName, iid, cid) {
                var that = this;

                return this.del(patternName, iid).then(function() {
                    return that.count(patternName, {
                        withoutCache: true,
                        where: {
                            category_id: cid
                        }
                    });
                }).then(function(count) {
                    if ( _.isUndefined(count) ) {
                        return;
                    }

                    return that.save('Category', {
                        id: cid,
                        count: count
                    });
                });
            }
        };

        return Adapter;
    })();


    BaasCMS.init = function(options) {
        BaasCMS.opts = _.extend({
            baas: 'Parse',
            loaderDelay: 300
        }, options);

        var loaderCounter = 0,
            loaderTimeouts = [],
            $loader = $();

        $(function() {
            $loader = $('#baascms-loader');
        });

        BaasCMS.adapter = new BaasCMS.Adapter(BaasCMS.Adapters[BaasCMS.opts.baas], {
            cmsOpts: BaasCMS.opts,
            onStart: function(queryUid) {
                loaderTimeouts[queryUid] = setTimeout(function() {
                    loaderTimeouts[queryUid] = 0;
                    loaderCounter++;
                    $loader.show();
                }, BaasCMS.opts.loaderDelay);
            },
            onComplete: function(queryUid) {
                clearTimeout(loaderTimeouts[queryUid]);

                if (loaderTimeouts[queryUid] === 0) { // time is up, loader is shown
                    loaderCounter--;
                }

                delete loaderTimeouts[queryUid];

                if (loaderCounter <= 0) {
                    $loader.hide();
                }
            }
        });
    };

})(window, document, window._, window.JSON, window.jQuery);

               /* setItemsOpts: function(patternName) {
                    var dasherized = _.str.dasherize(patternName);

                    this.opts.items[patternName] = _.extend({
                        templateWrap: 'template-baascms-items' + dasherized + '-wrap',
                        templateElement: 'template-baascms-items' + dasherized + '-element',
                        select: undefined,
                        where: {},
                        perPage: 5,
                        sort: '-createdAt',
                        beforeQuery: function() {},
                        afterQuery: function() {},
                        beforeRender: function() {},
                        afterRender: function() {}
                    }, this.opts.items[patternName]);
                },*/
/*
                        that.getItems(params, dataCategory.pattern_name).done(function(dataPatterns, dataArticles) {
                            var pattern = _.findWhere(dataPatterns, {name: dataCategory.pattern_name}) || {};

                            _.extend(data, {
                                pattern: pattern,
                                items: dataArticles
                            });

                            if (itemsOpts.afterQuery.call(that, params, data) === false || itemsOpts.beforeRender.call(that, params, data) === false) {
                                return;
                            }

                            that.fill( waitfor, that.renderItems(params, data, true) );

                            itemsOpts.afterRender.call(that, params, data);
                        });

                        */
            /*count: function(modelName, opts) {
                var opts = opts || {};
                opts.count = true;

return this.query(modelName, opts);

                var deferred = $.Deferred(),
                    opts = opts || {},
                    cacheKey = 'count_' + JSON.stringify(opts),
                    that = this;

                if ( opts.withoutCache === true || !this._cache[modelName] || _.isUndefined(this._cache[modelName][cacheKey]) ) {
                    if (this._concurrents[cacheKey]) {
                        return this._concurrents[cacheKey].promise();
                    }

                    this._concurrents[cacheKey] = deferred;

                    var queryUid = this.onStart();

                    this._count(modelName, opts, deferred).done(function(data) {
                        that._cache[modelName] = that._cache[modelName] || {};
                        that._cache[modelName][cacheKey] = data;
                    }).always(function() {
                        delete that._concurrents[cacheKey];
                        that.onComplete(queryUid);
                    });
                } else {
                    deferred.resolve(this._cache[modelName][cacheKey]);
                }

                return deferred.promise();
            },*/

                        /*var interval = setInterval(function() {
                            if (this._concurrents[cacheKey]) {
                                return;
                            }

                            clearInterval(interval);

                            if (opts.withoutCache === true || !that._cache[modelName] || !that._cache[modelName][cacheKey]) {
                                make.call(this);
                            } else {
                                deferred.resolve( JSON.parse(that._cache[modelName][cacheKey]) ); console.log('Get cache '+ modelName + ': ' + cacheKey);
                            }
                        }, 50);*/

    /*BaasCMS.opts = _.extend( {
        adapter: 'Parse'
    }, (BaasCMS.opts || {}) );

    //BaasCMS.Widgets = ( BaasCMS.Widgets || {} );
    //BaasCMS.controllers = ( BaasCMS.controllers || {} );
    BaasCMS.Widget = (function() {
        var Widget = function(opts) {

        };

        Widget.prototype = {};

        return Widget;
    })();*/

        /*$(document).on('click', '[data-event^="click:"]', function(e) {
            var $this = $(this),
                event = $this.data('event');

            if (typeof BaasCMS.EventDispatcher[event] === 'function') {
                return BaasCMS.EventDispatcher[event](e, $this);
            }
        });*/