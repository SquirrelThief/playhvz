/*
 * Copyright 2020 Google Inc.

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

/** Class to mimic locally what firebase functions would have done on the server side. */

class FakeChatUtils { }

FakeChatUtils.create = function (fakeDatabase, associatedGroupId, chatName, withAdmins) {
  let generatedId = fakeDatabase.idGenerator.generateId("chat", chatName);
  return new ChatRoom({
    id: generatedId,
    [ChatPath.FIELD_NAME]: chatName,
    [ChatPath.FIELD_ASSOCIATED_GROUP_ID]: associatedGroupId,
    [ChatPath.FIELD_WITH_ADMINS]: withAdmins,
    [ChatPath.FIELD_IS_VISIBLE]: true,
  });
}

// Add player to specified chat room and group
FakeChatUtils.addPlayerToChat = function (fakeDatabase, gameId, player, groupId, chatRoom) {
  let group = fakeDatabase.getGroup(gameId, groupId)
  group[GroupPath.FIELD__MEMBERS].add(player.id)
  let chatMembership = {}
  chatMembership[PlayerPath.FIELD__CHAT_VISIBILITY] = true;
  chatMembership[PlayerPath.FIELD__CHAT_NOTIFICATIONS] = true;
  player[PlayerPath.FIELD__CHAT_MEMBERSHIPS][chatRoom.id] = chatMembership
}

// Remove player from specified chat room and group
FakeChatUtils.removePlayerFromChat = function (fakeDatabase, gameId, player, groupId, chatRoom) {
  let group = fakeDatabase.getGroup(gameId, groupId)
  group[GroupPath.FIELD__MEMBERS].delete(player.id)
  // We have to use dot-notation or firebase will overwrite the entire field.
  delete player[PlayerPath.FIELD__CHAT_MEMBERSHIPS][chatRoom.id]
}
