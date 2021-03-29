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
  // Firebase Timestamps aren't milliseconds, convert all timestamps to be MS.
  for (let life in player[PlayerPath.FIELD__LIVES]) {
    player[PlayerPath.FIELD__LIVES][life][PlayerPath.FIELD__LIFE_CODE_TIMESTAMP] = player[PlayerPath.FIELD__LIVES][life][PlayerPath.FIELD__LIFE_CODE_TIMESTAMP].toMillis()
  }
  return player
};

DataConverterUtils.convertSnapshotToGroup = function (documentSnapshot) {
  const group = new Group(documentSnapshot.data())
  group.id = documentSnapshot.id
  return group
};

DataConverterUtils.convertSnapshotToChatRoom = function (documentSnapshot) {
  const chatRoom = new ChatRoom(documentSnapshot.data())
  chatRoom.id = documentSnapshot.id
  return chatRoom
};

DataConverterUtils.convertSnapshotToMessage = function (documentSnapshot) {
  const message = new Message(documentSnapshot.data())
  if (message.timestamp == null) {
    // When we first send a message the time isn't set and will be null.
    // Once firebase sets the timestamp we'll actually process the message.
    return null;
  }
  message.id = documentSnapshot.id
  // Firebase Timestamps are objects... which is not what we're expecting.
  message.timestamp = message.timestamp.toMillis()
  return message
};

DataConverterUtils.convertSnapshotToReward = function (documentSnapshot) {
  const reward = new Reward(documentSnapshot.data())
  reward.id = documentSnapshot.id
  return reward
};

DataConverterUtils.convertSnapshotToMission = function (documentSnapshot) {
  const mission = new Mission(documentSnapshot.data())
  mission.id = documentSnapshot.id
  return mission
};