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
 * Firebase constants for the Reward collection.
 ***********************************************************************/
class MissionPath { }

MissionPath.COLLECTION_PATH = "missions";
MissionPath.FIELD__GROUP_ID = "associatedGroupId";
MissionPath.FIELD__NAME = "name";
MissionPath.FIELD__START_TIME = "startTime";
MissionPath.FIELD__END_TIME = "endTime";
MissionPath.FIELD__DETAILS = "details";
MissionPath.FIELD__ALLEGIANCE_FILTER = "allegianceFilter";

MissionPath.MISSION_COLLECTION = function (db, gameId) {
  return GamePath.GAMES_COLLECTION(db).doc(gameId).collection(MissionPath.COLLECTION_PATH);
}

MissionPath.MISSION_DOC_REF = function (db, gameId, missionId) {
  return MissionPath.MISSION_COLLECTION(db, gameId).doc(missionId);
}