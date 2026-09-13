'use strict';

const express = require('express');
const { isCommunityRoot } = require('../moderation/policy');

const router = express.Router();

function postSocialMetadata({ post, origin, siteName, venuePackage }) {
  const canonicalUrl = `${origin}/post/${encodeURIComponent(post.author)}/${encodeURIComponent(post.permlink)}`;
  const rawDescription = String(
    post.excerpt || `A post by @${post.author} on ${siteName}.`,
  ).replace(/\s+/g, ' ').trim();
  return Object.freeze({
    canonicalUrl,
    socialDescription: rawDescription.slice(0, 200),
    socialImage: new URL(venuePackage.brand.logo.src, origin).toString(),
  });
}

router.get('/post/:author/:permlink', async (req, res, next) => {
  try {
    const discussion = await req.app.locals.services.moderation.getPostWithComments(
      req.params.author,
      req.params.permlink,
    );
    res.locals.showModerationControls = Boolean(
      isCommunityRoot(discussion.post, req.app.locals.config.hive.communityId) &&
        req.app.locals.services.moderation.isOperator(req.hiveSession?.account),
    );
    const viewData = {
      ...discussion,
      communityName: req.app.locals.config.hive.communityId,
    };

    if (req.get('HX-Request') === 'true') {
      return res.render('partials/full-post', viewData);
    }

    const metadata = postSocialMetadata({
      post: discussion.post,
      origin: req.app.locals.config.auth.appOrigin,
      siteName: req.app.locals.config.site.name,
      venuePackage: req.app.locals.venuePackage,
    });

    return res.render('pages/post/index', {
      ...viewData,
      pageTitle: `${discussion.post.title} — ${req.app.locals.config.site.name}`,
      canonicalUrl: metadata.canonicalUrl,
      socialTitle: discussion.post.title,
      socialDescription: metadata.socialDescription,
      socialType: 'article',
      socialImage: metadata.socialImage,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
module.exports.postSocialMetadata = postSocialMetadata;
