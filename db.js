//  --                                                          # {{{1
//
//  File        : db.js
//  Maintainer  : Felix C. Stegerman <felixstegerman@noxqslabs.nl>
//  Date        : 2012-03-15
//
//  Copyright   : Copyright (C) 2012  Felix C. Stegerman
//  Licence     : GPLv2
//
//  --                                                          # }}}1

var none  = undefined;
var DEBUG = true;

var DB    = {};

//  --

//
//  Usage: db_error_cb (e) -> none
//

function db_error_cb (e) {                                    //  {{{1
  console.log ("SQL Error: " + e.message);
}                                                             //  }}}1

// --

//
//  Usage: db_with (name)(f, f_success, f_error) -> none
//

function db_with (name) {                                     //  {{{1
  return function (f, f_success, f_error) {
    var db = window.openDatabase (
      name, DB[name].version, DB[name].d_name, DB[name].size
    );
    db.transaction (f, f_error, f_success);
  }
}                                                             //  }}}1


//
//  Usage: db_seq (name)(fs, f_error) -> none
//

function db_seq (name) {                                      //  {{{1
  return function (fs, f_error) {               
    var w = db_with (name);
    var f = function () {};

    for (var i = fs.length - 1; i >= 0; --i) {
      f = (function (g, h) {
        return function () { w (g, h, f_error); };
      })(fs[i], f);
    }

    return f ();
  }
}                                                             //  }}}1


//
//  Usage: db_def (name, version, d_name, size, tables[, fs]) -> none
//
//  Example:
//    db_def (
//      'Foo Bar Baz', '1.0', '...', 200000, {
//        tbl_foo: [
//          'foo TEXT'    , // ...
//          'bar INTEGER' , // ...
//        ], ...
//      }, function () { ... }
//    );
//

function db_def (name, version, d_name, size, tables, fs) {   //  {{{1
  DB[name] = {
    name:     name          ,
    version:  version       ,
    d_name:   d_name        ,
    size:     size          ,
    tables:   tables        ,
    fields:   {}            ,
    seq:      db_seq (name) ,
  };

  DB[name].seq (
    [ function (tx) {
        for (var k in tables) {
          DB[name].fields[k] = tables[k].map (
            function (x) { return x.split (/\s+/)[0]; }
          );

          sql = 'CREATE TABLE IF NOT EXISTS '
              + k + ' (id INTEGER PRIMARY KEY, '
              + tables[k].join (', ') + ' );';

          if (DEBUG) { console.log (sql); }

          tx.executeSql (sql);
        }
      }
    ].concat (fs || []), db_error_cb
  )

  // ... TODO ...
}                                                             //  }}}1


//
//  Usage: db_defns (name) -> none
//

function db_defns (name) {                                    //  {{{1
  var tables = DB[name].tables;

  for (var i in tables) {
    var t = tables[i];
    var T = t[0].toUpperCase () + t.substr (1);

    var f_q = function (f, f_error, w, v) { 
      return db_query (
        DB[name].table, DB[name].fields], f, f_error, w, v
      );
    };
    var f_i = function (records) {
      return db_insert (DB[name].table, DB[name].fields], records);
    };
    var f_u = function (records) {
      return db_update (DB[name].table, DB[name].fields], records);
    };

    DB[name]['q' + T] = f_q;
    DB[name]['i' + T] = f_i;
    DB[name]['u' + T] = f_u;
  }
}                                                             //  }}}1

// --

//
//  Usage: db_query (table, fields, f, f_error[, where, where_vals])
//          -> none
//
//  Example:
//    ...
//

function db_query (table, fields, f, f_error, w, vs) {        //  {{{1
  var vs_ = vs == none ? [] : vs;

  return function (tx) {
    var sql = 'SELECT id, ' + fields.join (', ') 
            + ' FROM ' + table
            + (w == none ? '' : ' WHERE ' + w);

    if (DEBUG) { console.log (sql); }

    var g = function (tx, rs) {
      var len = rs.rows.length;

      for (var i = 0; i < len; ++i) {
        f (i, rs.rows.item(i));
      }
    };

    tx.executeSql (sql, vs_, g, f_error);
  }
}                                                             //  }}}1


//
//  Usage: db_insert (table, fields, records) -> none
//
//  Example:
//    ...
//

function db_insert (table, fields, records) {                 //  {{{1
  return function (tx) {
    var qms = fields.map (function (x) { return '?'; }).join (', ');

    for (var i in records) {
      var sql = 'INSERT INTO ' + table 
              + ' ( id, ' + fields.join (', ') 
              + ' ) VALUES ( NULL, ' + qms + ' )';

      if (DEBUG) {
        console.log (sql);
        console.log (records[i]);
      }

      tx.executeSql (
        sql, fields.map (function (x) { return records[i][x]; })
      );
    }
  }
}                                                             //  }}}1


//
//  Usage: db_update (table, fields, records[, where_key,
//                    where_vals_key]) -> none
//
//  Example:
//    ...
//

function db_update (table, fields, records, wk, vk) {         //  {{{1
  wk_ = wk == none ? '_W_' : wk;
  vk_ = vk == none ? '_V_' : vk;

  return function (tx) {
    for (var i in records) {
      var fs = fields.filter (
        function (x) { return records[i][x] != none }
      );

      var r_vals  = fs.map (function (x) { return records[i][x]; });
      var w_vals  = records[i][vk_] || [];

      var sql     
        = 'UPDATE ' + table + ' SET ' 
        + fs.map (function (x) { return x + ' = ?' }).join (', ')
        + ' WHERE ' + records[i][wk_];

      if (DEBUG) {
        console.log (sql);
        console.log (records[i]);
      }

      tx.executeSql (sql, r_vals.concat (w_vals));
    }
  }
}                                                             //  }}}1

//  --

//  vim: set tw=70 sw=2 sts=2 et fdm=marker :
