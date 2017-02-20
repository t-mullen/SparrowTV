<h1 align="center">
  <br>
  <a href="https://sparrowtv.herokuapp.net"><img src="https://s28.postimg.org/aw130lq8t/sparrowblue.png" alt="SparrowTV" width="180"></a>
  <br>
  SparrowTV
  <br>
  <br>
</h1>
<h4 align="center">Scalable P2P Real-Time Streaming over WebRTC</h4>
<br>
[![Build Status](https://travis-ci.org/RationalCoding/SparrowTV.svg?branch=master)](https://travis-ci.org/RationalCoding/SparrowTV)

SparrowTV is a realtime video streaming platform that uses WebRTC and a tree model to scale.  
Each peer sends the stream to two other peers, leading to exponential growth.  
<a href="https://sparrowtv.herokuapp.com/">LIVE DEMO</a>

- Video streaming servers can cost millions of dollars. This removes the need entirely.  
- No software installation (*for viewers with compatiable browsers*).
- MIT Licensed!

This low-cost alternative to traditional streaming servers allows anyone to run their own live-streaming service.

## TODO:
- Content integrity checks (currently, viewers could theoretically manipulate the streams they share).
- Better churn management.
- Increase outdegree based on bandwidth.
- Traditional fallback for non-WebRTC browsers.
- Streamer/chat moderation features.
- Aesthetics (emoji, themes, etc)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

<div>Icon made by <a href="http://www.flaticon.com/authors/vignesh-oviyan" title="Vignesh Oviyan">Vignesh Oviyan</a> from <a href="http://www.flaticon.com" title="Flaticon">www.flaticon.com</a>. Licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>
