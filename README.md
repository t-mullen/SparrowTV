<h1 align="center">
  <br>
  <a href="https://sparrowtv.herokuapp.net"><img src="https://github.com/RationalCoding/SparrowTV/blob/master/public/assets/img/sparrowblue.png?raw=true" alt="SparrowTV" width="180"></a>
  <br>
  SparrowTV
  <br>
  <br>
</h1>
<h4 align="center">Tree-based P2P Live Streaming over WebRTC</h4>
<br>

SparrowTV is a live video streaming platform that uses WebRTC and a simple tree model.  
Each peer sends the stream to two other peers, which in turn sends it to two others.
<a href="https://sparrowtv.herokuapp.com/">LIVE DEMO</a>

I built this as a WebRTC demo awhile ago. The tree model would collapse under churn and is not suitable for more than a few dozen peers. However, it does promise lower latency than some existing WebRTC streaming demos that use mesh topologies.

<div>Icon made by <a href="http://www.flaticon.com/authors/vignesh-oviyan" title="Vignesh Oviyan">Vignesh Oviyan</a> from <a href="http://www.flaticon.com" title="Flaticon">www.flaticon.com</a>. Licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>
