//  --                                                          # {{{1
//
//  File        : db_websql.js
//  Maintainer  : Felix C. Stegerman <felixstegerman@noxqslabs.nl>
//  Date        : 2012-03-18
//
//  Copyright   : Copyright (C) 2012  Felix C. Stegerman
//  Licence     : GPLv2 or EPLv1
//
//  Depends     : ...
//  Description : ...
//
//  TODO        : ...
//
//  --                                                          # }}}1

//
//  :: _db_cmp (o)(x, y) -> { expr: ..., vals: ... }
//
//  Description : returns a function that returns a filter object for
//                the specified comparison operator.
//

function _db_cmp (o) {                                        //  {{{1
  _chk_args (arguments, 1, 1);

  return function (x, y) {
    _chk_args (arguments, 2, 2);

    return { expr: ' ' + x + ' ' + o + ' ? ', vals: [y] };
  };
}                                                             //  }}}1


//
//  :: _db_cps (o)(x, y, ...) -> { expr: ..., vals: ... }
//
//  Description : returns a function that returns a filter object that
//                combines multiple filter objects with the specified
//                composition operator.
//

function _db_cps (o) {                                        //  {{{1
  _chk_args (arguments, 1, 1);

  var f = function (x, y) {
    if (arguments.length < 2) {
      _die ('#args not in 2..');                              //  !!!!
    }
    else if (arguments.length > 2) {
      var rest = Array.prototype.slice.call (arguments, 1);   //  !!!!

      return f (x, f.apply (null, rest));                     //  TODO
    }
    else {
      return  { expr: ' (' + x.expr + o + y.expr + ') '
              , vals: x.vals.concat (y.vals) };
    }
  };

  return f;
}                                                             //  }}}1

//  --

//
//  :: _db_with (name)(f, f_success, f_error) -> none
//
//  Depends     : window.openDatabase; _DB.
//  Description : opens database; performs transaction.
//

function _db_with (name) {                                    //  {{{1
  _chk_args (arguments, 1, 1);

  return function (f, f_success, f_error) {
    _chk_args (arguments, 3, 3);

    var dbo = _DB[name];
    var dbh = window.openDatabase (                           //  !!!!
      name, dbo.version, dbo.desc, dbo.size
    );
    dbh.transaction (f, f_error, f_success);                  //  !!!!
  };
}                                                             //  }}}1

//  --

//
//  :: _db_create_table (tbl, tables, f_error)(tx) -> none
//
//  Depends     : DB_DEBUG -> db_log.
//  Description : creates table.
//

function _db_create_table (tbl, tables, f_error) {            //  {{{1
  _chk_args (arguments, 3, 3);

  return function (tx) {
    var sql = 'CREATE TABLE IF NOT EXISTS '
            + tbl + ' ( id INTEGER PRIMARY KEY, '
            + tables[tbl].join (', ') + ' )';

    if (DB_DEBUG) { db_log ('sql:', sql); }                   //  !!!!

    tx.executeSql (sql, none, none, f_error);                 //  !!!!
  };
}                                                             //  }}}1

// --

//
//  :: _db_query (table, fields, f[, f_error, where])(tx) -> none
//
//  Depends     : DB_DEBUG -> db_log; db_error_cb.
//  Description : queries DB.
//

function _db_query (table, fields, f, f_error, where) {       //  {{{1
  _chk_args (arguments, 3, 5);

  var f_err = f_error || db_error_cb;
  var vals  = where == none ? [] : where.vals;

  return function (tx) {
    var sql = 'SELECT id, ' + fields.join (', ')
            + ' FROM ' + table
            + (where == none ? '' : ' WHERE ' + where.expr.trim ());

    if (DB_DEBUG) {                                           //  !!!!
      db_log ('sql:', sql);
      db_log ('vls:', vals);
    }

    var g = function (tx, rs) {
      if (DB_DEBUG) { db_log ('res:', rs); }                  //  !!!!

      var len = rs.rows.length;

      for (var i = 0; i < len; ++i) {
        f (i, rs.rows.item(i));                               //  !!!!
      }
    };

    tx.executeSql (sql, vals, g, f_err);                      //  !!!!
  };
}                                                             //  }}}1


//
//  :: _db_insert (table, fields, records[, f, f_error])(tx) -> none
//
//  Depends     : DB_DEBUG -> db_log; db_error_cb.
//  Description : inserts into DB.
//

function _db_insert (table, fields, records, f, f_error) {    //  {{{1
  _chk_args (arguments, 3, 5);

  var f_err = f_error || db_error_cb;

  return function (tx) {
    var qms = fields.map (function (x) { return '?'; }).join (', ');
    var ids = [];                                             //  !!!!

    for (var i in records) {
      var sql = 'INSERT INTO ' + table
              + ' ( id, ' + fields.join (', ')
              + ' ) VALUES ( NULL, ' + qms + ' )';

      if (DB_DEBUG) {                                         //  !!!!
        db_log ('sql:', sql);
        db_log ('rec:', records[i]);
      }

      tx.executeSql (                                         //  !!!!
        sql,
        fields.map (function (x) { return records[i][x]; }),
        function (tx, rs) {
          if (DB_DEBUG) { db_log ('res:', rs); }              //  !!!!

          ids.push (rs.insertId);                             //  !!!!
        },
        f_err
      );
    }

    if (f != none) { f (ids); }                               //  !!!!
  };
}                                                             //  }}}1


//
//  :: _db_update (table, fields, records[, f_error, where_key])(tx)
//      -> none
//
//  Depends     : DB_DEBUG -> db_log; db_error_cb.
//  Description : updates DB.
//

function _db_update (table, fields, records, f_error, wk) {   //  {{{1
  _chk_args (arguments, 3, 5);

  var f_err = f_error || db_error_cb;
  var wk_   = wk == none ? '_W_' : wk;

  return function (tx) {
    for (var i in records) {
      var fs      = fields.filter (
        function (x) { return records[i][x] != none; }
      );

      var flds    = fs.map (
        function (x) { return x + ' = ?'; }
      ).join (', ');

      var r_vals  = fs.map (function (x) { return records[i][x]; });
      var w_vals  = records[i][wk_].vals;
      var vals    = r_vals.concat (w_vals);

      var sql = 'UPDATE ' + table + ' SET ' + flds
              + ' WHERE ' + records[i][wk_].expr.trim ();

      if (DB_DEBUG) {                                         //  !!!!
        db_log ('sql:', sql);
        db_log ('vls:', vals);
        db_log ('rec:', records[i]);
      }

      tx.executeSql (sql, vals, none, f_err);                 //  !!!!
    }
  };
}                                                             //  }}}1

//  --

//  vim: set tw=70 sw=2 sts=2 et fdm=marker :
