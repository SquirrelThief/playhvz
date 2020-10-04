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
class RewardPath { }

RewardPath.COLLECTION_PATH = "rewards";
RewardPath.FIELD__MANAGED = "managed";
RewardPath.FIELD__SHORT_NAME = "shortName";
RewardPath.FIELD__LONG_NAME = "longName";
RewardPath.FIELD__DESCRIPTION = "description";
RewardPath.FIELD__IMAGE_URL = "imageUrl";
RewardPath.FIELD__POINTS = "points";

RewardPath.CLAIM_CODE_COLLECTION_PATH = "claimCodes";
RewardPath.FIELD__CLAIM_CODE_CODE = "code";
RewardPath.FIELD__CLAIM_CODE_REDEEMER = "redeemer";
RewardPath.FIELD__CLAIM_CODE_TIMESTAMP = "timestamp";