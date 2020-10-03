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
 * Firebase constants for the Chat collection.
 ***********************************************************************/
class ChatPath { }

ChatPath.COLLECTION_PATH = "chatRooms";
ChatPath.FIELD__NAME = "name";
ChatPath.FIELD__ASSOCIATED_GROUP_ID = "associatedGroupId";
ChatPath.FIELD__WITH_ADMINS = "withAdmins";
ChatPath.FIELD__IS_VISIBLE = "isVisible";

ChatPath.MESSAGE_COLLECTION_PATH = "messages";
ChatPath.FIELD__MESSAGE_SENDER_ID = "senderId";
ChatPath.FIELD__MESSAGE_TIMESTAMP = "timestamp";
ChatPath.FIELD__MESSAGE_MESSAGE = "message";