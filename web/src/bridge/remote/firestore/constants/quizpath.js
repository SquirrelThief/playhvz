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
 * Firebase constants for the Game collection.
 ***********************************************************************/
class QuizPath { }

QuizPath.COLLECTION_PATH = "quizQuestions";
QuizPath.FIELD__TYPE = "type"; // One of boolean|info|multipleChoice|order
QuizPath.FIELD__INDEX = "index";
QuizPath.FIELD__TEXT = "text";
QuizPath.FIELD__ANSWERS = "answers";
QuizPath.FIELD__ANSWER_CORRECT = "correct";
QuizPath.FIELD__ANSWER_ORDER = "order";
QuizPath.FIELD__ANSWER_TEXT = "text";

QuizPath.QUIZ_QUESTION_COLLECTION = function (db, gameId) {
  return GamePath.GAMES_COLLECTION(db).doc(gameId).collection(QuizPath.COLLECTION_PATH);
}

QuizPath.QUIZ_QUESTION_DOC_REF = function (db, gameId, quizQuestionId) {
  return QuizPath.QUIZ_QUESTION_COLLECTION(db, gameId).doc(quizQuestionId);
}