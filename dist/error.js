"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _lodash = _interopRequireDefault(require("lodash"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
var Errors = {
  SQLITE_CONSTRAINT: function SQLITE_CONSTRAINT(sqliteError) {
    return {
      code: 'E_UNIQUE',
      message: sqliteError.message,
      invalidAttributes: []
    };
  }
};
var AdapterError = {
  wrap: function wrap(cb, txn) {
    return function (sqliteError) {
      var errorWrapper = Errors[sqliteError.code] || sqliteError;
      var error = sqliteError;
      if (_lodash["default"].isFunction(errorWrapper)) {
        error = errorWrapper(sqliteError);
      }
      _lodash["default"].isFunction(cb) && cb(error);
    };
  }
};
var _default = exports["default"] = AdapterError;