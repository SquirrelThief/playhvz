/*
 Copyright 2020 Google Inc.

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
 * Util functions to convert from Firebase.DocumentSnapshot to a class.
 ***********************************************************************/
class DataConverterUtils { }

DataConverterUtils.convertSnapshotToGame = function (documentSnapshot) {
  const game = new Game(documentSnapshot.data())
  game.id = documentSnapshot.id
  return game
};

DataConverterUtils.convertSnapshotToPlayer = function (documentSnapshot) {
  const player = new Player(documentSnapshot.data())
  player.id = documentSnapshot.id
  return player
};