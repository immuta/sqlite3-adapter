"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _fs = _interopRequireDefault(require("fs"));
var _sqlite = _interopRequireDefault(require("sqlite3"));
var _knex = _interopRequireDefault(require("knex"));
var _lodash = _interopRequireDefault(require("lodash"));
var _waterlineSequel = _interopRequireDefault(require("waterline-sequel"));
var _waterlineErrors = _interopRequireDefault(require("waterline-errors"));
var _waterlineCursor = _interopRequireDefault(require("waterline-cursor"));
var _util = _interopRequireDefault(require("./util"));
var _error = _interopRequireDefault(require("./error"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
var Adapter = {
  identity: 'waterline-sqlite3',
  wlSqlOptions: {
    parameterized: true,
    caseSensitive: false,
    escapeCharacter: '"',
    wlNext: false,
    casting: true,
    canReturnValues: false,
    escapeInserts: true,
    declareDeleteAlias: false
  },
  /**
   * Local connections store
   */
  connections: new Map(),
  pkFormat: 'integer',
  syncable: true,
  /**
   * Adapter default configuration
   */
  defaults: {
    schema: true,
    debug: false,
    type: 'disk',
    filename: '.tmp/db.sqlite',
    path: '.tmp'
  },
  /**
   * This method runs when a connection is initially registered
   * at server-start-time. This is the only required method.
   *
   * @param  {[type]}   connection
   * @param  {[type]}   collection
   * @param  {Function} cb
   * @return {[type]}
   */
  registerConnection: function registerConnection(connection, collections, cb) {
    var _this = this;
    if (!connection.identity) {
      return cb(_waterlineErrors["default"].adapter.IdentityMissing);
    }
    if (this.connections.get(connection.identity)) {
      return cb(_waterlineErrors["default"].adapter.IdentityDuplicate);
    }
    _lodash["default"].defaults(connection, this.defaults);
    var filename = !_lodash["default"].isEmpty(connection.filename) && connection.filename != ':memory:' ? connection.filename : '.tmp/' + connection.identity + '.sqlite';
    if (connection.type == 'memory') {
      if (!_lodash["default"].isEmpty(filename) && filename != ':memory:' && filename != this.defaults.filename) {
        console.error("\n          WARNING:\n          The connection config for the sqlite3 connection ".concat(connection.identity, "\n          specifies the filename \"").concat(filename, "\" but specifies type=\"memory\". The\n          file will not be used, and the data will not be persistent.\n        "));
      }
      filename = ':memory:';
    }
    _fs["default"].mkdir(connection.path, function () {
      _this.connections.set(connection.identity, {
        identity: connection.identity,
        schema: _this.buildSchema(connection, collections),
        collections: collections,
        knex: (0, _knex["default"])({
          client: 'sqlite3',
          connection: {
            filename: filename
          },
          debug: process.env.WATERLINE_DEBUG_SQL || connection.debug,
          useNullAsDefault: true
        })
      });
      cb();
    });
  },
  /**
   * Construct the waterline schema for the given connection.
   *
   * @param connection
   * @param collections[]
   */
  buildSchema: function buildSchema(connection, collections) {
    return _lodash["default"].chain(collections).map(function (model, modelName) {
      var definition = _lodash["default"].get(model, ['waterline', 'schema', model.identity]);
      return _lodash["default"].defaults(definition, {
        attributes: {},
        tableName: modelName
      });
    }).keyBy('tableName').value();
  },
  /**
   * Describe a table. List all columns and their properties.
   *
   * @see http://www.sqlite.org/pragma.html#pragma_table_info
   * @see http://www.sqlite.org/faq.html#q7
   * @see https://github.com/AndrewJo/sails-sqlite3/blob/master/lib/adapter.js#L156
   *
   * @param connectionName
   * @param tableName
   */
  describe: function describe(connectionName, tableName, cb) {
    var cxn = this.connections.get(connectionName);
    return Promise.all([cxn.knex.raw("pragma table_info(\"".concat(tableName, "\")")), cxn.knex.raw("pragma index_list(\"".concat(tableName, "\")"))]).then(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
        _ref2$ = _ref2[0],
        tableInfo = _ref2$ === void 0 ? [] : _ref2$,
        _ref2$2 = _ref2[1],
        indexList = _ref2$2 === void 0 ? [] : _ref2$2;
      return Promise.all(indexList.map(function (index) {
        return cxn.knex.raw("pragma index_info(\"".concat(index.name, "\")")).then(function (_ref3) {
          var _ref4 = _slicedToArray(_ref3, 1),
            _ref4$ = _ref4[0],
            indexInfo = _ref4$ === void 0 ? {} : _ref4$;
          var indexResult = _lodash["default"].extend(indexInfo, index);
          return indexResult;
        });
      })).then(function (indexes) {
        return _util["default"].transformTableInfo(tableInfo, _lodash["default"].flatten(indexes));
      });
    }).then(function (result) {
      if (_lodash["default"].isEmpty(result)) return cb();
      _lodash["default"].isFunction(cb) && cb(null, result);
      return result;
    })["catch"](_error["default"].wrap(cb));
  },
  /**
   * Drop a table
   */
  drop: function drop(connectionName, tableName) {
    var relations = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
    var cb = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : relations;
    var cxn = Adapter.connections.get(connectionName);
    return cxn.knex.schema.dropTableIfExists(tableName).then(function (result) {
      _lodash["default"].isFunction(cb) && cb();
    })["catch"](_error["default"].wrap(cb));
  },
  /**
   * Create a new table
   *
   * @param connectionName
   * @param tableName
   * @param definition - the waterline schema definition for this model
   * @param cb
   */
  define: function define(connectionName, tableName, definition, cb) {
    var cxn = this.connections.get(connectionName);
    return cxn.knex.schema.createTable(tableName, function (table) {
      _lodash["default"].each(definition, function (definition, attributeName) {
        var newColumn = _util["default"].toKnexColumn(table, attributeName, definition);
        _util["default"].applyColumnConstraints(newColumn, definition);
      });
      _util["default"].applyTableConstraints(table, definition);
    }).then(function (result) {
      _lodash["default"].isFunction(cb) && cb();
    })["catch"](_error["default"].wrap(cb));
  },
  /**
   * Add a column to a table
   */
  addAttribute: function addAttribute(connectionName, tableName, attributeName, definition, cb) {
    var cxn = this.connections.get(connectionName);
    return cxn.knex.schema.table(tableName, function (table) {
      var newColumn = _util["default"].toKnexColumn(table, attributeName, definition);
      return _util["default"].applyColumnConstraints(newColumn, definition);
    }).then(function () {
      _lodash["default"].isFunction(cb) && cb();
    })["catch"](_error["default"].wrap(cb));
  },
  /**
   * Remove a column from a table
   */
  removeAttribute: function removeAttribute(connectionName, tableName, attributeName, cb) {
    var cxn = this.connections.get(connectionName);
    return cxn.knex.schema.table(tableName, function (table) {
      table.dropColumn(attributeName);
    }).then(function (result) {
      _lodash["default"].isFunction(cb) && cb(null, result);
      return result;
    })["catch"](_error["default"].wrap(cb));
  },
  /**
   * Perform a direct SQL query on the database
   *
   * @param connectionName
   * @param tableName
   * @param queryString
   * @param data
   */
  query: function query(connectionName, tableName, queryString) {
    var args = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
    var cb = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : args;
    var cxn = this.connections.get(connectionName);
    var query = cxn.knex.raw(_util["default"].toKnexRawQuery(queryString), _util["default"].castValues(args));
    return query.then(function (rows) {
      var result = _lodash["default"].map(rows, function (row) {
        return _util["default"].castSqlValues(row, cxn.collections[tableName]);
      });
      _lodash["default"].isFunction(cb) && cb(null, result);
      return result;
    })["catch"](_error["default"].wrap(cb));
  },
  /**
   * Create a new record
   *
   * @param connectionName {String}
   * @param tableName {String}
   * @param record {Object}
   * @param cb {Function}
   */
  create: function create(connectionName, tableName, record, cb) {
    var cxn = this.connections.get(connectionName);
    var pk = this.getPrimaryKey(cxn, tableName);
    var newRecord;
    return cxn.knex.transaction(function (txn) {
      return txn.insert(_util["default"].castRecord(record)).into(tableName).then(function (_ref5) {
        var _ref6 = _slicedToArray(_ref5, 1),
          rowid = _ref6[0];
        return txn.select().from(tableName).where('rowid', rowid);
      }).then(function (_ref7) {
        var _ref8 = _slicedToArray(_ref7, 1),
          created = _ref8[0];
        newRecord = _util["default"].castSqlValues(created, cxn.collections[tableName]);
        return newRecord;
      })["catch"](_error["default"].wrap(cb));
    }).then(function () {
      _lodash["default"].isFunction(cb) && cb(null, newRecord);
      return newRecord;
    });
  },
  /**
   * Find records
   *
   * @param connectionName {String}
   * @param tableName {String}
   * @param options {Object}
   * @param cb {Function}
   */
  find: function find(connectionName, tableName, options, cb) {
    var _this2 = this;
    var cxn = this.connections.get(connectionName);
    var wlsql = new _waterlineSequel["default"](cxn.schema, this.wlSqlOptions);
    if (options.select && !options.select.length) {
      delete options.select;
    }
    return new Promise(function (resolve, reject) {
      resolve(wlsql.find(tableName, options));
    }).then(function (_ref9) {
      var _ref9$query = _slicedToArray(_ref9.query, 1),
        query = _ref9$query[0],
        _ref9$values = _slicedToArray(_ref9.values, 1),
        values = _ref9$values[0];
      return _this2.query(connectionName, tableName, query, values);
    }).then(function () {
      var rows = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      _lodash["default"].isFunction(cb) && cb(null, rows);
      return rows;
    })["catch"](_error["default"].wrap(cb));
  },
  /**
   * Update a record
   *
   * @param connectionName {String}
   * @param tableName {String}
   * @param options {Object}
   * @param data {Object}
   * @param cb {Function}
   */
  update: function update(connectionName, tableName, options, data, cb) {
    var _this3 = this;
    var cxn = this.connections.get(connectionName);
    var wlsql = new _waterlineSequel["default"](cxn.schema, this.wlSqlOptions);
    var pk = this.getPrimaryKey(cxn, tableName);
    var updateRows;
    return cxn.knex.transaction(function (txn) {
      return new Promise(function (resolve, reject) {
        var wlsql = new _waterlineSequel["default"](cxn.schema, _this3.wlSqlOptions);
        resolve(wlsql.simpleWhere(tableName, _lodash["default"].pick(options, 'where')));
      }).then(function (_ref0) {
        var where = _ref0.query,
          values = _ref0.values;
        var _where$split = where.split('WHERE'),
          _where$split2 = _slicedToArray(_where$split, 2),
          $ = _where$split2[0],
          whereClause = _where$split2[1];
        return txn.select('rowid').from(tableName).whereRaw(txn.raw(_util["default"].toKnexRawQuery(whereClause), values));
      }).then(function (rows) {
        updateRows = _lodash["default"].compact(_lodash["default"].map(rows, pk));
        // TODO cleanup updateRows
        if (updateRows.length === 0) {
          updateRows = _lodash["default"].compact(_lodash["default"].map(rows, 'rowid'));
        }
        var wlsql = new _waterlineSequel["default"](cxn.schema, _this3.wlSqlOptions);
        return wlsql.update(tableName, options, data);
      }).then(function (_ref1) {
        var _query = _ref1.query,
          values = _ref1.values;
        var _query$split = _query.split('SET'),
          _query$split2 = _slicedToArray(_query$split, 2),
          $ = _query$split2[0],
          setClause = _query$split2[1];
        var query = "UPDATE \"".concat(tableName, "\" SET ") + setClause;
        return txn.raw(_util["default"].toKnexRawQuery(query), _util["default"].castValues(values));
      }).then(function () {
        return txn.select().from(tableName).whereIn('rowid', updateRows);
      });
    }).then(function (rows) {
      var result = _lodash["default"].map(rows, function (row) {
        return _util["default"].castSqlValues(row, cxn.collections[tableName]);
      });
      _lodash["default"].isFunction(cb) && cb(null, result);
    })["catch"](_error["default"].wrap(cb));
  },
  /**
   * Destroy a record
   *
   * @param connectionName {String}
   * @param tableName {String}
   * @param options {Object}
   * @param cb {Function}
   */
  destroy: function destroy(connectionName, tableName, options, cb) {
    var _this4 = this;
    var cxn = this.connections.get(connectionName);
    var wlsql = new _waterlineSequel["default"](cxn.schema, this.wlSqlOptions);
    var found;
    return this.find(connectionName, tableName, options).then(function (_found) {
      found = _found;
      return wlsql.simpleWhere(tableName, _lodash["default"].pick(options, 'where'));
    }).then(function (_ref10) {
      var where = _ref10.query,
        values = _ref10.values;
      var query = "DELETE FROM \"".concat(tableName, "\" ") + where;
      return _this4.query(connectionName, tableName, query, values);
    }).then(function (rows) {
      _lodash["default"].isFunction(cb) && cb(null, found);
      return found;
    })["catch"](_error["default"].wrap(cb));
  },
  /**
   * Count the number of records
   *
   * @param connectionName {String}
   * @param tableName {String}
   * @param options {Object}
   * @param cb {Function}
   */
  count: function count(connectionName, tableName, options, cb) {
    var _this5 = this;
    var cxn = this.connections.get(connectionName);
    var wlsql = new _waterlineSequel["default"](cxn.schema, this.wlSqlOptions);
    return new Promise(function (resolve, reject) {
      resolve(wlsql.count(tableName, options));
    }).then(function (_ref11) {
      var _ref11$query = _slicedToArray(_ref11.query, 1),
        _query = _ref11$query[0],
        _ref11$values = _slicedToArray(_ref11.values, 1),
        values = _ref11$values[0];
      var _query$split3 = _query.split('AS'),
        _query$split4 = _slicedToArray(_query$split3, 2),
        query = _query$split4[0],
        asClause = _query$split4[1];
      return _this5.query(connectionName, tableName, query.trim(), values);
    }).then(function (_ref12) {
      var _ref13 = _slicedToArray(_ref12, 1),
        row = _ref13[0];
      var count = Number(row.count);
      _lodash["default"].isFunction(cb) && cb(null, count);
      return count;
    })["catch"](_error["default"].wrap(cb));
  },
  /**
   * Populate record associations
   *
   * @param connectionName {String}
   * @param tableName {String}
   * @param options {Object}
   * @param cb {Function}
   */
  join: function join(connectionName, tableName, options, cb) {
    var cxn = this.connections.get(connectionName);
    (0, _waterlineCursor["default"])({
      instructions: options,
      parentCollection: tableName,
      $find: function $find(tableName, criteria, next) {
        return Adapter.find(connectionName, tableName, criteria, next);
      },
      $getPK: function $getPK(tableName) {
        if (!tableName) return;
        return Adapter.getPrimaryKey(cxn, tableName);
      }
    }, cb);
  },
  /**
   * Get the primary key column of a table
   *
   * @param cxn
   * @param tableName
   */
  getPrimaryKey: function getPrimaryKey(_ref14, tableName) {
    var collections = _ref14.collections;
    var definition = collections[tableName].definition;
    if (!definition._pk) {
      var pk = _lodash["default"].findKey(definition, function (attr, name) {
        return attr.primaryKey === true;
      });
      definition._pk = pk || 'id';
    }
    return definition._pk;
  },
  /**
   * Fired when a model is unregistered, typically when the server
   * is killed. Useful for tearing-down remaining open connections,
   * etc.
   *
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  teardown: function teardown(conn) {
    var _this6 = this;
    var cb = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : conn;
    var connections = conn ? [this.connections.get(conn)] : this.connections.values();
    var promises = [];
    var _iterator = _createForOfIteratorHelper(connections),
      _step;
    try {
      var _loop = function _loop() {
        var cxn = _step.value;
        if (!cxn) return 1; // continue
        promises.push(new Promise(function (resolve) {
          cxn.knex.destroy(resolve);
          _this6.connections["delete"](cxn.identity);
        }));
      };
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        if (_loop()) continue;
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    return Promise.all(promises).then(function () {
      return cb();
    })["catch"](cb);
  }
};
_lodash["default"].bindAll(Adapter, _lodash["default"].functions(Adapter));
var _default = exports["default"] = Adapter;