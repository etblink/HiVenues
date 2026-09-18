'use strict';

const { requireHiveAccount, requirePermlink } = require('../http/validation');
const { ValidationError } = require('../lib/errors');
const { fingerprint } = require('../hive/social-operations');

const VOTE_DIRECTIONS = new Set(['upvote', 'downvote']);

function requireVoteDirection(value) {
  const direction = String(value || '').trim().toLowerCase();
  if (!VOTE_DIRECTIONS.has(direction)) {
    throw new ValidationError('Vote direction must be upvote or downvote');
  }
  return direction;
}

function requireVotePercent(value) {
  const percent = Number(value);
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
    throw new ValidationError('Vote percentage must be a whole number from 1 to 100');
  }
  return percent;
}

function voteWeight(direction, percent) {
  return percent * 100 * (direction === 'downvote' ? -1 : 1);
}

function buildVote({
  account: accountValue,
  author: authorValue,
  permlink: permlinkValue,
  direction: directionValue,
  percent: percentValue,
}) {
  const account = requireHiveAccount(accountValue);
  const author = requireHiveAccount(authorValue, 'Vote target author');
  const permlink = requirePermlink(permlinkValue);
  const direction = requireVoteDirection(directionValue);
  const percent = requireVotePercent(percentValue);
  const weight = voteWeight(direction, percent);
  const operation = Object.freeze([
    'vote',
    Object.freeze({
      voter: account,
      author,
      permlink,
      weight,
    }),
  ]);
  const operations = Object.freeze([operation]);

  return Object.freeze({
    action: 'vote',
    account,
    authority: 'Posting',
    operations,
    fingerprint: fingerprint(operations),
    summary: Object.freeze({
      kind: 'Hive vote',
      voter: account,
      author,
      permlink,
      direction,
      percent,
      weight,
    }),
  });
}

module.exports = {
  VOTE_DIRECTIONS,
  buildVote,
  requireVoteDirection,
  requireVotePercent,
  voteWeight,
};
