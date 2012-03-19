//  --                                                          # {{{1
//
//  File        : db.js
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

var DB_DEBUG  = true;
var _DB       = {};

//  --

var db_log = function () { console.log.apply (console, arguments); }

//  --

var db_eq   = _db_cmp ('==' );
var db_ne   = _db_cmp ('!=' );

var db_ge   = _db_cmp ('>=' );
var db_gt   = _db_cmp ('>'  );

var db_le   = _db_cmp ('<=' );
var db_lt   = _db_cmp ('<'  );

var db_and  = _db_cps ('AND');
var db_or   = _db_cps ('OR' );

//  --

//
//  :: db_error_cb (e) -> none
//
//  Depends     : db_log.
//  Description : default error callback; logs to console.
//

function db_error_cb (e) {                                    //  {{{1
  _chk_args (arguments, 1, 1);

  db_log ('SQL Error:', e.message);                           //  !!!!
}                                                             //  }}}1

// --

//
//  :: _db_seq (name)(fs, f_error) -> none
//
//  Depends     : _db_with.
//  Description : sequences db functions.
//

function _db_seq (name) {                                     //  {{{1
  _chk_args (arguments, 1, 1);

  var w = _db_with (name);

  return function (fs, f_error) {
    _chk_args (arguments, 2, 2);

    var f = function () {};

    for (var i = fs.length - 1; i >= 0; --i) {
      f = (function (g, h) {
        return function () { w (g, h, f_error); };            //  !!!!
      })(fs[i], f);
    }

    return f ();
  };
}                                                             //  }}}1

//  --

//
//  :: _db_defns (name) -> none
//
//  Depends     : _DB; _db_{query,insert,update}.
//  Description : defines table functions in DB obj.
//

function _db_defns (name) {                                   //  {{{1
  _chk_args (arguments, 1, 1);

  var dbo = _DB[name];

  for (var t_ in dbo.tables) {
    (function (t) {
      var T = t[0].toUpperCase () + t.substr (1);

      dbo['q' + T] = function (f, f_error, w) {               //  !!!!
        _chk_args (arguments, 1, 3);

        return _db_query (t, dbo.fields[t], f, f_error, w);
      };

      dbo['i' + T] = function (records, f) {                  //  !!!!
        _chk_args (arguments, 1, 2);

        return _db_insert (t, dbo.fields[t], records, f);
      };

      dbo['u' + T] = function (records) {                     //  !!!!
        _chk_args (arguments, 1, 1);

        return _db_update (t, dbo.fields[t], records);
      };
    })(t_);
  }
}                                                             //  }}}1

//  --

//
//  :: db (name, def[, f, f_error]) -> none
//
//  Depends     : _DB, _db_seq, _db_create_table, _db_defns;
//                db_error_cb.
//  Description : defines database; runs functions.
//

function db (name, def, f, f_error) {                         //  {{{1
  _chk_args (arguments, 2, 4);

  var f_    = f       || function () { return []; };
  var f_err = f_error || db_error_cb;

  if (def == none) {
    var dbo = _DB[name];                                      //  !!!!
    var fs  = [];                                             //  !!!!
  }
  else {
    var dbo = _DB[name] = {                                   //  !!!!
      name:     name          ,
      version:  def.version   ,
      desc:     def.desc      ,
      size:     def.size      ,
      tables:   def.tables    ,
      fields:   {}            ,
      seq:      _db_seq (name),
    };

    var fs = [ function (tx) {                                //  !!!!
      for (var k in def.tables) {
        _db_create_table (tx, def.tables, k);
      }
    } ]

    for (var k in def.tables) {
      dbo.fields[k] = def.tables[k].map (                     //  !!!!
        function (x) { return _split_ws (x)[0]; }
      );
    }

    _db_defns (name);                                         //  !!!!
  }

  dbo.seq (fs.concat (f_ (dbo)), f_err);                      //  !!!!
}                                                             //  }}}1

//  --

//  vim: set tw=70 sw=2 sts=2 et fdm=marker :
