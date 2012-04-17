//  --                                                            {{{1
//
//  File        : db_websql.js
//  Maintainer  : Felix C. Stegerman <felixstegerman@noxqslabs.nl>
//  Date        : 2012-04-17
//
//  Copyright   : Copyright (C) 2012  Felix C. Stegerman
//  Licence     : GPLv2 or EPLv1
//
//  Depends     : ...
//  Description : ...
//
//  TODO        : ...
//
//  --                                                            }}}1

this.dbjs = {};

//  --

(function (_this) {

var db = _this.dbjs;

//  --

//
//  :: _cmp (o)(x, y) -> { expr: ..., vals: ... }
//
//  Description : returns a function that returns a filter object for
//                the specified comparison operator.
//

db._cmp = function (o) {                                      //  {{{1
  tools.chk_args (arguments, 1, 1);

  return function (x, y) {
    tools.chk_args (arguments, 2, 2);

    return { expr: ' ' + x + ' ' + o + ' ? ', vals: [y] };
  };
}                                                             //  }}}1


//
//  :: _cps (o)(x, y, ...) -> { expr: ..., vals: ... }
//
//  Description : returns a function that returns a filter object that
//                combines multiple filter objects with the specified
//                composition operator.
//

db._cps = function (o) {                                      //  {{{1
  tools.chk_args (arguments, 1, 1);

  var f = function (x, y) {
    if (arguments.length < 2) {
      tools.die ('#args not in 2..');                         //  !!!!
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
//  :: _with (dbo)(f, f_success, f_error) -> none
//
//  Depends     : window.openDatabase.
//  Description : opens database; performs transaction.
//

db._with = function (dbo) {                                   //  {{{1
  tools.chk_args (arguments, 1, 1);

  return function (f, f_success, f_error) {
    tools.chk_args (arguments, 3, 3);

    var dbh = window.openDatabase (                           //  !!!!
      dbo.name, dbo.version, dbo.desc, dbo.size
    );
    dbh.transaction (f, f_error, f_success);                  //  !!!!
  };
}                                                             //  }}}1

//  --

//
//  :: _create_table (tbl, tables, f_error)(tx) -> none
//
//  Depends     : DEBUG -> log.
//  Description : creates table.
//

db._create_table = function (tbl, tables, f_error) {          //  {{{1
  tools.chk_args (arguments, 3, 3);

  return function (tx) {
    var sql = 'CREATE TABLE IF NOT EXISTS '
            + tbl + ' ( id INTEGER PRIMARY KEY, '
            + tables[tbl].join (', ') + ' )';

    if (db.DEBUG) { db.log ('sql:', sql); }                   //  !!!!

    tx.executeSql (sql, none, none, f_error);                 //  !!!!
  };
}                                                             //  }}}1

// --

//
//  :: _query (table, fields, f[, f_error, where])(tx) -> none
//
//  Depends     : DEBUG -> log; error_cb.
//  Description : queries DB.
//

db._query = function (table, fields, f, f_error, where) {     //  {{{1
  tools.chk_args (arguments, 3, 5);

  var f_err = f_error || db.error_cb;
  var vals  = where == none ? [] : where.vals;

  return function (tx) {
    var sql = 'SELECT id, ' + fields.join (', ')
            + ' FROM ' + table
            + (where == none ? '' : ' WHERE ' + where.expr.trim ());

    if (db.DEBUG) {                                           //  !!!!
      db.log ('sql:', sql);
      db.log ('vls:', vals);
    }

    var g = function (tx, rs) {
      if (db.DEBUG) { db.log ('res:', rs); }                  //  !!!!

      var len = rs.rows.length;

      for (var i = 0; i < len; ++i) {
        f (i, rs.rows.item(i));                               //  !!!!
      }
    };

    tx.executeSql (sql, vals, g, f_err);                      //  !!!!
  };
}                                                             //  }}}1


//
//  :: _insert (table, fields, records[, f, f_error])(tx) -> none
//
//  Depends     : DEBUG -> log; error_cb.
//  Description : inserts into DB.
//

db._insert = function (table, fields, records, f, f_error) {  //  {{{1
  tools.chk_args (arguments, 3, 5);

  var f_err = f_error || db.error_cb;
  var n     = records.length;

  return function (tx) {
    var qms = fields.map (function (x) { return '?'; }).join (', ');
    var ids = [];                                             //  !!!!

    for (var i in records) {
      var id    = records[i].id;
      var fid   = id == none ? 'NULL' : '?';
      var fs    = id == none ? fields : ['id'].concat (fields);
      var vals  = fs.map (function (x) { return records[i][x]; });

      var sql = 'INSERT INTO ' + table
              + ' ( id, ' + fields.join (', ')
              + ' ) VALUES ( ' + fid + ', ' + qms + ' )';

      if (db.DEBUG) {                                         //  !!!!
        db.log ('sql:', sql);
        db.log ('vls:', vals);
        db.log ('rec:', records[i]);
      }

      tx.executeSql (                                         //  !!!!
        sql,
        vals,
        function (tx, rs) {
          if (db.DEBUG) { db.log ('res:', rs); }              //  !!!!

          ids.push (rs.insertId);                             //  !!!!

          // NB: must call f here to prevent async problems!

          if (f && ids.length == n) { f (ids); }              //  !!!!
        },
        f_err
      );
    }
  };
}                                                             //  }}}1


//
//  :: _update (table, fields, records[, f_error, where_key])(tx)
//      -> none
//
//  Depends     : DEBUG -> log; error_cb.
//  Description : updates DB.
//

db._update = function (table, fields, records, f_error, wk) { //  {{{1
  tools.chk_args (arguments, 3, 5);

  var f_err = f_error || db.error_cb;
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

      if (db.DEBUG) {                                         //  !!!!
        db.log ('sql:', sql);
        db.log ('vls:', vals);
        db.log ('rec:', records[i]);
      }

      tx.executeSql (sql, vals, none, f_err);                 //  !!!!
    }
  };
}                                                             //  }}}1

//  --

})(this);

//  --

//  vim: set tw=70 sw=2 sts=2 et fdm=marker :
