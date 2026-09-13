// SOXLO Messenger hotfix: keep diagnostic crypto failures out of the visible chat.
renderMessages = async function(scroll=true){
  const rendered=[];
  for(const m of messages) rendered.push({...m,...await decryptMessageRow(m)});
  const visible=rendered.filter(m=>!m.error);
  messageList.innerHTML=visible.map(m=>`<div class="msg ${m.sender_id===userId()?'mine':''}">${esc(m.plain)}${m.legacy?'<span class="legacy-badge">Legacy unencrypted</span>':''}<time>${new Date(m.created_at).toLocaleString([], {hour:'2-digit',minute:'2-digit',month:'short',day:'numeric'})}</time></div>`).join('');
  if(scroll) messageList.scrollTop=messageList.scrollHeight;
};

updateSecurityState = function(){
  if(!activeContact)return;
  const devices=activeContact.devices||[];
  const trusted=devices.filter(d=>isDeviceTrusted(activeContact.id,d.fp));
  const allTrusted=devices.length>0&&trusted.length===devices.length;
  $('voiceCallVisualBtn').disabled=!allTrusted;
  $('videoCallBtn').disabled=!allTrusted;
  messageInput.disabled=!allTrusted;
  $('sendBtn').disabled=!allTrusted;
  verifyDevicesBtn.hidden=allTrusted||!devices.length;
  securityStatus.textContent='';
  securityStatus.className='security-status';
  if(!devices.length){
    chatStatus.textContent='Waiting for secure device registration';
  }else if(!allTrusted){
    chatStatus.textContent='Verify devices to unlock secure chat';
  }else{
    chatStatus.textContent='End-to-end encrypted';
  }
};
