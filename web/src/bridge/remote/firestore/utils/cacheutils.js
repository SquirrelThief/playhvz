/*
 * Copyright 2021 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */

/***********************************************************************
 * Util functions to optimize firebase queries.
 ***********************************************************************/
class CacheUtils { }

CacheUtils.optimizedGet = async function (ref) {
  var fromCache = {
    source: 'cache'
  };
  var fromServer = {
    source: 'server'
  };

  return ref.get(fromCache).then((doc) => {
    // Document was found in the cache.
    return doc;
  }).catch((error) => {
    return ref.get(fromServer).then((doc) => {
      return doc
    });
  });
};


