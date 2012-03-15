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

function _split_ws (s) { return s.trim ().split (/\s+/    ); }
function _split_co (s) { return s.trim ().split (/\s*,\s*/); }

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
      name, DB[name].version, DB[name].desc, DB[name].size
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
//  Usage: db_defns (name) -> none
//

function db_defns (name) {                                    //  {{{1
  var d = DB[name];

  for (var t_ in d.tables) {
    (function (t) {
      var T = t[0].toUpperCase () + t.substr (1);

      DB[name]['q' + T] = function (f, f_error, w, v) {
        return db_query (t, d.fields[t], f, f_error, w, v);
      };

      DB[name]['i' + T] = function (records) {
        return db_insert (t, d.fields[t], records);
      };

      DB[name]['u' + T] = function (records) {
        return db_update (t, d.fields[t], records);
      };
    })(t_);
  }
}                                                             //  }}}1


//
//  Usage: db (name, def[, f]) -> none
//
//  Example:
//    db (
//      'foo', { version: '1.0', desc: '...', size: 200000, tables: {
//        foo: [
//          'x TEXT'    , // ...
//          'y INTEGER' , // ...
//        ],
//        bar: _split_co ('z TEXT, zz INTEGER'),
//        ...
//      } },
//      function () { return [
//        function (tx) { ... },
//        function (tx) { ... },
//      ]; }
//    );
//

function db (name, def, f) {                                  //  {{{1
  var f_ = f == none ? function () { return []; } : f;

  if (DB[name] != none) {
    DB[name].seq (f_ (), db_error_cb);

    return;                                                   //  !!!!
  }

  DB[name] = {
    name:     name          ,
    version:  def.version   ,
    desc:     def.desc      ,
    size:     def.size      ,
    tables:   def.tables    ,
    fields:   {}            ,
    seq:      db_seq (name) ,
  };

  for (var k in def.tables) {
    DB[name].fields[k] = def.tables[k].map (
      function (x) { return _split_ws (x)[0]; }
    );
  }

  db_defns (name);

  DB[name].seq (
    [ function (tx) {
        for (var k in def.tables) {
          var sql = 'CREATE TABLE IF NOT EXISTS '
                  + k + ' (id INTEGER PRIMARY KEY, '
                  + def.tables[k].join (', ') + ' );';

          if (DEBUG) { console.log (sql); }

          tx.executeSql (sql);
        }
      }
    ].concat (f_ ()), db_error_cb
  )
}                                                             //  }}}1

// --

//
//  Usage: db_query (table, fields, f, f_error[, where, where_vals])
//          -> none
//
//  Example:
//    db (..., function () { return [
//      ...
//      DB.foo.qFoo (f, f_error),   // iterates: f (i, x)
//      ...
//    ]; });
//

function db_query (table, fields, f, f_error, w, vs) {        //  {{{1
  var vs_ = vs == none ? [] : vs;

  return function (tx) {
    var sql = 'SELECT id, ' + fields.join (', ')
            + ' FROM ' + table
            + (w == none ? '' : ' WHERE ' + w);

    if (DEBUG) {
      console.log (sql);
      console.log (vs_);
    }

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
//    db (..., function () { return [
//      ...
//      DB.foo.iFoo ([{ k1: v1, k2: v2}, ...]),
//      ...
//    ]; });
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
//    db (..., function () { return [
//      ...
//      DB.foo.uFoo ([
//      { k   : v,
//        _W_ : 'x < ? AND y > ?',  // WHERE clause; use '?' !!!
//        _V_ : [x, y]              // values for '?'s
//      }, ...]),
//      ...
//    ]; });
//
//  TODO: WHERE ??? !!!
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
