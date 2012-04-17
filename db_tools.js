//  --                                                            {{{1
//
//  File        : db_tools.js
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

this.none   = undefined;
this.tools  = {};

//  --

(function (_this) {

//  --

var t = _this.tools;

//  --

t.split_ws  = function (s) { return s.trim ().split (/\s+/    ); }
t.split_co  = function (s) { return s.trim ().split (/\s*,\s*/); }

//  --

t.to_json   = function (x) { return JSON.stringify (x, none, 2); }
t.from_json = function (x) { return JSON.parse (x);              }

//  --

t.die = function (s) {
  throw new Error (s);                                        //  !!!!
}

t.chk_args = function (a, n, m) {
  if (a.length < n || a.length > m) {
    t.die ('#args not in ' + n + '..' + m);                   //  !!!!
  }
}

//  --

})(this);

//  --

//  vim: set tw=70 sw=2 sts=2 et fdm=marker :
