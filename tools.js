//  --                                                          # {{{1
//
//  File        : tools.js
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

var none = undefined;

//  --

function _split_ws (s) { return s.trim ().split (/\s+/    ); }
function _split_co (s) { return s.trim ().split (/\s*,\s*/); }

//  --

function _die (s) {
  throw new Error (s);                                        //  !!!!
}

function _chk_args (a, n, m) {
  if (a.length < n || a.length > m) {
    _die ('#args not in ' + n + '..' + m);                    //  !!!!
  }
}

//  --

//  vim: set tw=70 sw=2 sts=2 et fdm=marker :
