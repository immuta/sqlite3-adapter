"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _moment = _interopRequireDefault(require("moment"));
var _lodash = _interopRequireDefault(require("lodash"));
var _adapter = _interopRequireDefault(require("./adapter"));
var _criteriaProcessor = _interopRequireDefault(require("waterline-sequel/sequel/lib/criteriaProcessor"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
var Util = {
  /**
   * Create a column for Knex from a Waterline atribute definition
   * https://www.sqlite.org/datatype3.html
   */
  toKnexColumn: function toKnexColumn(table, _name, attrDefinition) {
    var attr = _lodash["default"].isObject(attrDefinition) ? attrDefinition : {
      type: attrDefinition
    };
    var type = attr.autoIncrement ? 'serial' : attr.type;
    var name = attr.columnName || _name;
    switch (type.toLowerCase()) {
      case 'text':
      case 'mediumtext':
      case 'longtext':
      case 'string':
      case 'json':
      case 'array':
        return table.text(name, type);

      /**
       * table.integer(name) 
       * Adds an integer column.
       */
      case 'boolean':
      case 'serial':
      case 'smallserial':
      case 'bigserial':
      case 'int':
      case 'integer':
      case 'smallint':
      case 'bigint':
      case 'biginteger':
      case 'datestamp':
      case 'datetime':
      case 'date':
        return table.integer(name);

      /**
       * table.float(column, [precision], [scale]) 
       * Adds a float column, with optional precision and scale.
       */
      case 'real':
      case 'float':
      case 'double':
      case 'decimal':
        return table.specificType(name, 'REAL');
      case 'binary':
      case 'bytea':
        return table.binary(name);
      case 'sqltype':
      case 'sqlType':
        return table.specificType(name, type);
      default:
        console.error('Unregistered type given for attribute. name=', name, '; type=', type);
        return table.text(name);
    }
  },
  /**
   * Apply a primary key constraint to a table
   *
   * @param table - a knex table object
   * @param definition - a waterline attribute definition
   */
  applyPrimaryKeyConstraints: function applyPrimaryKeyConstraints(table, definition) {
    var primaryKeys = _lodash["default"].keys(_lodash["default"].pickBy(definition, function (attribute) {
      return attribute.primaryKey;
    }));
    return table.primary(primaryKeys);
  },
  applyTableConstraints: function applyTableConstraints(table, definition) {
    return this.applyPrimaryKeyConstraints(table, definition);
  },
  applyColumnConstraints: function applyColumnConstraints(column, definition) {
    var _this = this;
    if (_lodash["default"].isString(definition)) {
      return;
    }
    return _lodash["default"].map(definition, function (value, key) {
      if (key == 'defaultsTo' && definition.autoIncrement && value == 'AUTO_INCREMENT') {
        return;
      }
      return _this.applyParticularColumnConstraint(column, key, value, definition);
    });
  },
  applyParticularColumnConstraint: function applyParticularColumnConstraint(column, constraintName, value, definition) {
    if (!value) return;
    switch (constraintName) {
      case 'index':
        return column.index(_lodash["default"].get(value, 'indexName'), _lodash["default"].get(value, 'indexType'));

      /**
       * Acceptable forms:
       * attr: { unique: true }
       * attr: {
       *   unique: {
       *     unique: true, // or false
       *     composite: [ 'otherAttr' ]
       *   }
       * }
       */
      case 'unique':
        if ((value === true || _lodash["default"].get(value, 'unique') === true) && !definition.primaryKey) {
          column.unique();
        }
        return;
      case 'notNull':
        return column.notNullable();
      case 'defaultsTo':
        return column.defaultTo(value);
      case 'type':
        return;
      case 'primaryKey':
        return;
      case 'autoIncrement':
        return;
      case 'on':
        return;
      case 'via':
        return;
      case 'foreignKey':
        return;
      case 'references':
        return;
      case 'model':
        return;
      case 'alias':
        return;
      default:
        console.error('Unknown constraint [', constraintName, '] on column');
    }
  },
  /**
   * Convert a paramterized waterline query into a knex-compatible query string
   */
  toKnexRawQuery: function toKnexRawQuery() {
    var sql = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    return sql.replace(/\$\d+/g, '?');
  },
  castSqlValues: function castSqlValues(values, model) {
    return _lodash["default"].mapValues(values, function (value, attr) {
      var definition = model.definition[attr];
      if (!definition) {
        return value;
      }
      if (_lodash["default"].includes(['date', 'datetime', 'datestamp'], definition.type)) {
        return new Date(value);
      }
      if (definition.type == 'json' && _lodash["default"].isString(value)) {
        return JSON.parse(value);
      }
      if (definition.type == 'array' && _lodash["default"].isString(value)) {
        return JSON.parse(value);
      }
      return value;
    });
  },
  castRecord: function castRecord(record) {
    return _lodash["default"].zipObject(_lodash["default"].keys(record), this.castValues(record));
  },
  /**
   * Cast values to the correct type
   */
  castValues: function castValues(values) {
    return _lodash["default"].map(values, function (value) {
      if (_lodash["default"].isArray(value)) {
        return JSON.stringify(value);
      }
      if (_lodash["default"].isPlainObject(value)) {
        return JSON.stringify(value);
      }
      if (_lodash["default"].isNumber(value)) {
        return Number(value);
      }
      if (Buffer.isBuffer(value)) {
        return value;
      }
      if (_lodash["default"].isString(value)) {
        var stripped = value.replace(/\"/g, '');
        // Check the length of the stripped string. If it's longer than 6 characters, then convert it to a date using moment.
        // This is to prevent an incompatibility with newer versions of moment that treat all 4-6 digit strings as years, which
        // is technically in the ISO_8601 spec, but is not consistent with the way this library uses moment to parse dates.
        if (stripped.length > 6 && (0, _moment["default"])(stripped, _moment["default"].ISO_8601, true).isValid()) {
          return new Date(stripped).valueOf();
        }
      }
      if (_lodash["default"].isDate(value)) {
        return value.valueOf();
      }
      return value;
    });
  },
  transformTableInfo: function transformTableInfo(tableInfo, indexes) {
    return _lodash["default"].chain(tableInfo).map(function (column) {
      var index = _lodash["default"].find(indexes, {
        cid: column.cid
      });
      return {
        columnName: column.name,
        primaryKey: !!column.pk,
        type: column.type,
        indexed: !!(column.pk || index),
        unique: !!(column.pk || index && index.unique)
      };
    }).keyBy('columnName').value();
  }
};
_lodash["default"].bindAll(Util, _lodash["default"].functions(Util));
var _default = exports["default"] = Util;