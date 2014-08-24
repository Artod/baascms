/**
 * BaasCMS adapter for Parse.com v. 1.0.0
 * Copyright (c) 2014 Artod gartod@gmail.com
 * MIT License
*/

;(function(root, _, Parse, undefined) {
    var ParseAdapter = (function() {
        var _extractData = function(results, first) {            
            results = results || [];            
            results = _.isArray(results) ? results : [results];
            
            var out = [];

            for (var i = 0; i < results.length; i++) { 
                var object = results[i],
                    data = object._serverData;

                data.id = object.id;
                out.push(data);
            }    

            if (first) {
                out = out[0] || {};
            }
            
            return out;
        };
        
        var _setOptions = function(query, id, opts) {
            var opts = opts || {};
            
            var select = ( _.isString(opts.select)
                    ? [opts.select]
                    : ( _.isArray(opts.select)
                        ? opts.select
                        : false
                    )
                ),
                where = ( _.isObject(opts.where) ? opts.where : false ),
                limit = ( _.isNumber(opts.limit) ? opts.limit : false ),
                skip = ( _.isNumber(opts.skip) ? opts.skip : false ),
                order = false;

            if ( _.isObject(opts.order) ) {
                order = [];
                _.each(opts.order, function(key, val) {
                    order.push(key > 0 ? val : '-' + val);                        
                });
                
                if (!order.length) {
                    order = false;
                }
            } else if ( _.isString(opts.order) ) {    
                order = [opts.order];
            } else if ( _.isArray(opts.order) ) {    
                order = opts.order;
            }    

            if (id) {
                where = where || {};
                where.objectId = id;
                delete where.id;
            } else if (where && where.id) {
                where.objectId = where.id;
                delete where.id;
            }

            ;( select && ( query._select = select) );
            ( where && ( query._where = where) );
            ( limit && ( query._limit = limit) );
            ( skip && ( query._skip = skip) );
            ( order && ( query._order = order) );
        };
    
        function ParseAdapter(options) {
            if (!Parse) {
                console.info('Requires Parse JavaScript SDK.');
            }
        }

        _.extend(ParseAdapter.prototype, {
            _query: function(modelName, id, opts, deferred) {
                var Model = Parse.Object.extend(modelName),
                    query = new Parse.Query(Model);                    

                _setOptions(query, id, opts);
                    
                query.find().done(function(results) {
                    var data = _extractData(results, opts.first);
//setTimeout(function(){
                    deferred.resolve(data);
//}, Math.random() * 2000)
                }).fail(function(error) {
                    deferred.reject(error);
                });
                
                return deferred.promise();
            },
            _count: function(modelName, opts, deferred) {
                var Model = Parse.Object.extend(modelName),
                    query = new Parse.Query(Model);
                    
                _setOptions(query, '', opts);
            
                query._limit = 0;                
                _.extend(query._extraOptions, {
                    count: 1
                });    
                
                query.count().done(function(count) {
                    deferred.resolve(count);
                }).fail(function(error) {
                    deferred.reject(error);
                });
                
                return deferred.promise();
            },
            _save: function(modelName, data, deferred) {
                var Model = Parse.Object.extend(modelName),
                    model = new Model();
                
                model.save(data).done(function(result) {
                    var savedData = _extractData(result, true);
                    
// setTimeout(function(){
                    deferred.resolve(savedData.id);
// }, Math.random() * 2000)
                }).fail(function(error) {
                    deferred.reject(error);
                });
                
                return deferred.promise();
            },
            _del: function(modelName, ids, deferred) {
                var Model = Parse.Object.extend(modelName),
                    models = [];

                _.each(ids, function(id) {
                    var model = new Model();                    
                    model.id = id;                    
                    models.push(model);
                });
                
                Parse.Object.destroyAll(models).done(function(result) {
                    deferred.resolve(ids);
                }).fail(function(error) {
                    deferred.reject(error);
                });
                
                return deferred.promise();
            }
        });
        
        return ParseAdapter;
    })();
    
    root.BaasCMS = (root.BaasCMS || {});                
    var BaasCMS = root.BaasCMS;
    
    BaasCMS.adapters = (BaasCMS.adapters || {});
    
    BaasCMS.adapters.Parse = ParseAdapter;    
    
})(window, window._, window.Parse);