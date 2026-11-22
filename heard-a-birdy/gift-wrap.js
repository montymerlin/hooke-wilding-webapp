// A small unfolding sequence, followed by the original leafy entrance.
(() => {
 const wrapper=document.createElement('section');wrapper.className='gift-wrap';wrapper.setAttribute('aria-label','A gift for your garden');
 const bowPart=name=>`<span class="bow-piece ${name}"><img src="assets/gift-bow-v3.png" alt="" width="1254" height="1254"></span>`;
 wrapper.innerHTML=`<div class="paper top" aria-hidden="true"></div><div class="paper bottom" aria-hidden="true"></div><div class="paper left" aria-hidden="true"></div><div class="paper right" aria-hidden="true"></div><button class="parcel-button" type="button" aria-label="Unwrap your gift"><span class="bow" aria-hidden="true">${bowPart('bow-left')}${bowPart('bow-right')}${bowPart('bow-knot')}</span><span class="tag">Unwrap your gift<small>Pull the bow to unwrap</small></span></button>`;
 document.body.append(wrapper);const intro=document.getElementById('intro'),button=wrapper.querySelector('button');intro.inert=true;
 const entrance=document.getElementById('entrance'),openLeaves=entrance.onclick;
 entrance.onclick=async()=>{
  await openLeaves();
  // The Hooke controller focuses the new heading; preserve its top-of-page view.
  if(typeof reviewChapter!=='function')document.getElementById('continue').focus({preventScroll:true});
 };
 button.onclick=async()=>{
  if(button.disabled)return;button.disabled=true;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  wrapper.classList.add('unwrapping');
  if(!reduced){
   // Follow the actual animation completion, including each staggered flap.
   // Cancellation (for example changing motion preferences) also releases entry.
   await Promise.all(wrapper.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));
  }
  // Unwrapping reveals the invitation. Opening the forest is a separate gesture.
  wrapper.hidden=true;intro.inert=false;entrance.focus();
 };
 // Direct story review URLs remain useful; ordinary visits always start wrapped.
 const reviewValue=new URLSearchParams(location.search).get('scene');
 const hasReview=typeof reviewChapter==='function'?reviewChapter(reviewValue)!==null:reviewValue!==null;
 if(hasReview){wrapper.hidden=true;intro.inert=false;}
})();
