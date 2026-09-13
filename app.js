/* ================================================================
   DNP3 Terminology & Reference Platform
   app.js — application logic, organized into modular functions
   ================================================================ */

/* ---------------- DATA ---------------- */
const terms = [
  {t:"DNP3", cat:"Core", d:"DNP3 stands for Distributed Network Protocol 3, and it is the communications protocol that electric, water, and oil & gas utilities across North America use so that a control center computer can talk to equipment out in the field.", ex:"When a utility operator's SCADA screen shows a substation breaker as \"open\" or \"closed,\" that status almost certainly traveled from the substation to the control room over DNP3."},
  {t:"Master Station", cat:"Roles", d:"A master station is the computer system, usually running SCADA or HMI software, that starts every conversation by polling field devices for data and by sending out control commands.", ex:"A utility's control center server polling 40 substations every few seconds is acting as the DNP3 master."},
  {t:"Outstation", cat:"Roles", d:"An outstation is the field device that waits for and answers requests from the master, and it is usually built into hardware such as an RTU, a protective relay, or a smart meter.", ex:"A GE D400 remote terminal unit sitting inside a substation cabinet, reporting breaker status back to the control room, is functioning as a DNP3 outstation."},
  {t:"Unsolicited Response", cat:"Operation", d:"An unsolicited response is a message the outstation sends on its own initiative, without waiting to be asked, because something important just happened.", ex:"The instant a breaker trips due to a fault, the RTU fires off an unsolicited response so the operator finds out within a second or two instead of waiting for the next scheduled poll."},
  {t:"Class 0 Data", cat:"Data Model", d:"Class 0 data is the complete current snapshot of every point a device has — every status, every measurement — as opposed to just the things that have recently changed.", ex:"A master typically runs a full Class 0 integrity poll once every 5 to 60 minutes to make sure its database exactly matches the real state of the field device."},
  {t:"Class 1/2/3 Data", cat:"Data Model", d:"Classes 1, 2, and 3 are three priority buckets that an operator assigns to individual data points so the most urgent changes get read out first and most often.", ex:"A breaker trip alarm is commonly assigned to Class 1 and polled every few seconds, while a slow-moving tank-level reading might be Class 3 and only polled every 30 to 60 seconds."},
  {t:"Integrity Poll", cat:"Operation", d:"An integrity poll is a request for all of a device's Class 0 static data plus any buffered event data, and it is the mechanism that keeps a master's database from silently drifting out of sync with reality.", ex:"After a communications outage is repaired, the master immediately issues an integrity poll to every outstation it lost contact with, to catch up on anything it missed."},
  {t:"Object Group", cat:"Data Model", d:"An object group is a numbered category that tells you what kind of data point you're looking at, and the numbers are standardized so any two vendors' devices agree on what \"Group 30\" means.", ex:"Group 1 always means Binary Input and Group 30 always means Analog Input, whether the device is made by Schneider Electric, GE, or ABB."},
  {t:"Variation", cat:"Data Model", d:"A variation is a specific byte-level format within an object group, spelling out exactly which fields (value, flags, timestamp) are included and how many bits each one uses.", ex:"Group 30 Variation 1 encodes a 32-bit analog value with quality flags, while Group 30 Variation 5 encodes it as a 32-bit floating point number instead."},
  {t:"Point Index", cat:"Data Model", d:"A point index is simply the number assigned to one specific data point of a given type on one specific device, similar to a row number in a spreadsheet of that device's points.", ex:"On a substation RTU, \"Binary Input point index 3\" might specifically mean the status contact of circuit breaker CB-102."},
  {t:"Function Code", cat:"Application Layer", d:"A function code is a single byte in every application-layer message that tells the receiving device exactly what operation is being requested, such as Read, Write, Select, or Operate.", ex:"Function Code 1 (Read) is what a master sends to ask an outstation for its current data; Function Code 129 (Response) is what comes back."},
  {t:"Fragment", cat:"Application Layer", d:"A fragment is one complete application-layer message, which can be broken into several smaller transport segments and data link frames if it's too big to send in one piece.", ex:"A single large integrity-poll response listing hundreds of analog points may be sent as one fragment split across many individual frames."},
  {t:"Data Link Frame", cat:"Data Link Layer", d:"A data link frame is the smallest complete unit that actually travels on the wire, and it always starts with the same two bytes and always ends with a CRC checksum.", ex:"Wireshark and other protocol analyzers spot DNP3 traffic instantly because every real frame starts with the exact bytes 0x05 0x64."},
  {t:"CRC (Cyclic Redundancy Check)", cat:"Data Link Layer", d:"A CRC is a small checksum added after the header and after every 16-byte block of data specifically so that a receiving device can tell if noise on the line corrupted any bits along the way.", ex:"DNP3 uses its own specific 16-bit CRC polynomial (commonly catalogued as CRC-16/DNP), which is different from the CRC used by Modbus or standard Ethernet frames."},
  {t:"Link Address", cat:"Data Link Layer", d:"A link address is the 16-bit number identifying a specific device on the data link, letting a master address one outstation out of many on a shared line.", ex:"On a multi-drop serial radio network with 12 remote sites sharing one channel, each site is given its own link address, such as 101 through 112, so the master can talk to them individually."},
  {t:"Sequence Number (Application)", cat:"Application Layer", d:"A sequence number is a small counter in the application control byte that lets the master and outstation match up which response answers which request, and detect duplicate retransmissions.", ex:"If a response is lost and the master retries the same request, the outstation can recognize the repeated sequence number and avoid executing a control command twice."},
  {t:"Internal Indication (IIN)", cat:"Application Layer", d:"Internal Indications are a set of status flag bits that every outstation response carries, silently reporting things like \"I just restarted\" or \"my event buffer overflowed\" alongside the actual data.", ex:"If an RTU loses power and reboots, the very next response it sends will have its Device Restart IIN bit set, prompting the master to resynchronize time and configuration automatically."},
  {t:"Select-Before-Operate (SBO)", cat:"Control", d:"Select-Before-Operate is a deliberate two-step safety procedure: the master first selects a control point to check that the outstation will accept it, then sends a separate operate command to actually execute it.", ex:"Closing a substation breaker is almost always done with SBO so that a single corrupted or spoofed message can't accidentally energize a line that's still being worked on."},
  {t:"Direct Operate", cat:"Control", d:"Direct Operate skips the select step and executes a control command immediately in a single message, which is faster but carries more risk if that one message is wrong or malicious.", ex:"Adjusting a solar inverter's reactive power setpoint is a lower-consequence action, so plant controllers commonly use Direct Operate rather than the extra SBO handshake."},
  {t:"Binary Input (Group 1/2)", cat:"Object Groups", d:"A Binary Input is a two-state status point, like a switch that's either on or off, and Group 1 is its current value while Group 2 is the event log of when it last changed.", ex:"A circuit breaker's \"open\" or \"closed\" contact status is reported as a Binary Input."},
  {t:"Binary Output (Group 10/12)", cat:"Object Groups", d:"Binary Output objects represent a controllable two-state device; Group 10 reports its current status, while Group 12, the Control Relay Output Block (CROB), is the object sent to actually command it.", ex:"To trip or close a breaker remotely, the master sends a Group 12 CROB object using Select and Operate function codes."},
  {t:"Analog Input (Group 30/32)", cat:"Object Groups", d:"An Analog Input is any continuously variable measured quantity, like a voltage or a flow rate, and Group 30 is the current value while Group 32 is the event log of significant changes.", ex:"A transformer's oil temperature or a transmission line's voltage reading are both reported as Analog Inputs."},
  {t:"Analog Output (Group 40/41)", cat:"Object Groups", d:"Analog Output objects represent a controllable setpoint the master can adjust; Group 40 reports its current value, and Group 41 is the command object used to change it.", ex:"A plant controller writing a new reactive-power setpoint to a solar inverter uses a Group 41 Analog Output Command."},
  {t:"Counter (Group 20/22)", cat:"Object Groups", d:"A Counter is a value that only ever increases (or resets), used for anything that accumulates over time, with Group 20 giving the current total and Group 22 logging change events.", ex:"A pipeline flow meter's cumulative barrels-transferred total is reported as a Counter object."},
  {t:"Time and Date (Group 50/51/52)", cat:"Object Groups", d:"These object groups carry absolute or relative time values, and they exist specifically so the master can correct clock drift in remote outstations.", ex:"A master periodically writes a Group 50 Time and Date object to every outstation so that timestamps on events line up closely enough to compare across a whole pipeline or grid."},
  {t:"File Transfer (Group 70)", cat:"Object Groups", d:"Group 70 defines a set of objects for transferring whole files, such as configuration files or firmware images, over the same DNP3 link normally used for real-time data.", ex:"A technician can push a firmware update to a remote relay using Group 70 file transfer objects instead of visiting the site in person."},
  {t:"Deadband", cat:"Configuration", d:"A deadband is a configured threshold defining the minimum amount an analog value has to change before the outstation bothers reporting a new event for it.", ex:"A slowly filling water tank configured with a 0.5% deadband won't generate an event for every tiny ripple in level, only for genuinely meaningful changes."},
  {t:"Event Buffer", cat:"Configuration", d:"An event buffer is the outstation's own memory for storing change events until the master comes along and retrieves them, with configurable behavior for what happens if it fills up.", ex:"If a communications link to a remote site goes down for an hour, that site's event buffer holds onto every change that happened during the outage so nothing is lost once contact is restored."},
  {t:"Time Synchronization", cat:"Operation", d:"Time synchronization is the process, carried out with a Write function code and a Time and Date object, by which the master corrects an outstation's internal clock.", ex:"Because leak-detection math on a pipeline depends on comparing timestamps from meters over a hundred miles apart, even a few seconds of clock drift between them can throw the calculation off, which is why time sync is run regularly."},
  {t:"Cold Restart / Warm Restart", cat:"Operation", d:"Cold Restart (Function Code 13) tells a device to fully reboot, while Warm Restart (Function Code 14) asks for a lighter partial reset, both used mainly for maintenance or recovering from a fault.", ex:"A field engineer troubleshooting a misbehaving RTU may issue a Cold Restart remotely instead of driving out to power-cycle it by hand."},
  {t:"Secure Authentication (DNP3-SA)", cat:"Security", d:"Secure Authentication (SAv5), added in IEEE 1815-2012, requires a real cryptographic challenge-response handshake, such as HMAC-SHA-256, before a critical command like Operate will be accepted by the outstation.", ex:"Security researchers have repeatedly shown that a standard, unauthenticated DNP3 outstation will execute a valid-looking Direct Operate command from anyone who can reach it on the network — SAv5 exists specifically to close that gap."},
  {t:"Data Link Confirmation", cat:"Data Link Layer", d:"A data link confirmation is an optional low-level acknowledgment confirming that a frame physically arrived intact, separate from any higher-level application confirmation.", ex:"On a noisy, error-prone serial radio link, enabling data link confirmations lets a lost frame be quickly retried at the link layer instead of only being caught much later at the application layer."},
  {t:"Application Confirmation", cat:"Application Layer", d:"An application confirmation is a response confirming that an entire application-layer fragment was received and processed, requested by setting the CON bit in the application control byte.", ex:"A master sending a critical control command typically requires an application confirmation back before considering the command successfully delivered."},
  {t:"Multi-Drop Link", cat:"Data Link Layer", d:"A multi-drop link is a serial wiring topology where several outstations physically share the same communication line, each one only responding to messages addressed to its own link address.", ex:"A single radio channel connecting a master to 12 remote well sites, where every site listens on the shared frequency but only answers messages sent to its own address, is a multi-drop network."},
  {t:"DNP3 over TCP/IP", cat:"Networking", d:"DNP3 over TCP/IP wraps the same data link frames inside ordinary TCP (or UDP) packets, using the IANA-assigned default port 20000, which is how most modern substations and plants run DNP3 today instead of over serial radio.", ex:"A control center's SCADA master connects to a substation gateway over an Ethernet WAN link on TCP port 20000 rather than a dedicated serial cable."},
  {t:"Qualifier Code", cat:"Application Layer", d:"A qualifier code is a byte that specifies exactly how the object indices in a message are encoded, for instance as a start/stop range, an exhaustive list of indices, or \"all points of this type.\"", ex:"A read request for \"all Binary Inputs\" uses a qualifier code meaning \"all objects,\" while a request for \"points 5 through 9 only\" uses a start/stop range qualifier."},
  {t:"Object Header", cat:"Application Layer", d:"An object header is the small structure placed in front of a group of data objects in a fragment, stating the object group, the variation, and the qualifier/range that follows.", ex:"Before the actual voltage values in a response, an object header states \"this is Group 30, Variation 1, for indices 0 through 15.\""},
  {t:"Restart IIN Bit", cat:"Application Layer", d:"The Restart IIN bit is a specific Internal Indication flag automatically set when an outstation has rebooted, telling the master its configuration and clock may now be stale.", ex:"After a power blip causes a remote RTU to reboot, the master sees the Restart bit set in the next response and automatically re-runs time sync and an integrity poll."},
  {t:"Class Polling", cat:"Operation", d:"Class polling is a bandwidth-saving strategy where the master requests only a specific event class (1, 2, or 3) instead of re-reading the entire static database every time.", ex:"A master might poll Class 1 events every 2 seconds for urgent alarms, but only run the much larger Class 0 integrity poll once an hour."},
];

const functionCodes = [
  [0,"Confirm","Master ⇄ Outstation","Acknowledges that an application-layer fragment was received.","A master confirms receipt of a large multi-fragment response so the outstation knows it doesn't need to retransmit."],
  [1,"Read","Master → Outstation","Asks the outstation to send back the current value of specified data.","The most common message on any DNP3 network — a routine poll asking \"what is the current status of these points right now?\""],
  [2,"Write","Master → Outstation","Sends data into the outstation rather than reading it out.","Used to correct an outstation's clock by writing a Time and Date object."],
  [3,"Select","Master → Outstation","The first step of Select-Before-Operate: proposes a control action for validation.","Selecting Binary Output point 3 before actually closing that breaker."],
  [4,"Operate","Master → Outstation","The second step of Select-Before-Operate: executes the previously selected control.","Following a successful Select, the master sends Operate to actually close the breaker."],
  [5,"Direct Operate","Master → Outstation","Executes a control immediately in one message, skipping the select step.","Adjusting a solar inverter's reactive power setpoint without the extra select handshake."],
  [6,"Direct Operate No Ack","Master → Outstation","Same as Direct Operate, but tells the outstation not to bother sending a response.","Used sparingly, mainly on very low-bandwidth links where an acknowledgment isn't worth the airtime."],
  [7,"Immediate Freeze","Master → Outstation","Captures the current counter values into a snapshot without resetting them.","Freezing an energy meter's running total at midnight for billing purposes."],
  [9,"Freeze and Clear","Master → Outstation","Captures counter values into a snapshot and then resets the live counters to zero.","Closing out a billing period by freezing a meter's total and starting the next period from zero."],
  [13,"Cold Restart","Master → Outstation","Requests a full reboot of the outstation device.","A technician remotely reboots a misbehaving RTU instead of driving to the site."],
  [14,"Warm Restart","Master → Outstation","Requests a lighter, partial reset of the outstation.","Clearing a stuck communication task on an RTU without a full power-cycle."],
  [20,"Enable Unsolicited Responses","Master → Outstation","Turns on the outstation's ability to report events without being polled.","Enabled at commissioning so alarm conditions reach the control room within a second or two."],
  [21,"Disable Unsolicited Responses","Master → Outstation","Turns off unsolicited reporting, forcing strict poll-response behavior.","Temporarily disabled during maintenance testing to avoid flooding the master with test-related events."],
  [22,"Assign Class","Master → Outstation","Assigns which event class (1, 2, or 3) each data point belongs to.","Assigning a breaker-trip alarm to Class 1 so it gets polled the most frequently and urgently."],
  [23,"Delay Measurement","Master ⇄ Outstation","Measures round-trip communication delay to improve time synchronization accuracy.","Used just before a time-sync write to account for network latency in the correction."],
  [129,"Response","Outstation → Master","The standard reply to a master's request, carrying the requested data or a completion status.","The outstation's answer to a routine Read request, containing the current breaker status."],
  [130,"Unsolicited Response","Outstation → Master","A report the outstation sends on its own initiative because something notable happened.","An RTU immediately reports a breaker trip the moment it occurs, without waiting to be asked."],
];

const objectGroups = [
  [1,"Binary Input","1 (packed format), 2 (with flags)","A two-state status point. Real example: a breaker's open/closed contact status."],
  [2,"Binary Input Event","1–3 (with absolute or relative time)","Logged change events for binary inputs. Real example: the exact timestamped record of when a breaker tripped."],
  [10,"Binary Output","2 (output status)","Reports the current status of a controllable two-state output. Real example: confirming a breaker is now closed after a control command."],
  [12,"Binary Output Command / CROB","1 (control relay output block)","The object sent to actually issue a control command. Real example: the CROB object used to trip or close a breaker."],
  [20,"Counter","1–6 (32/16-bit, with/without flags)","An accumulating value that only increases. Real example: a pipeline flow meter's cumulative total volume."],
  [21,"Frozen Counter","1–10","A snapshot of a counter's value at the moment it was frozen. Real example: an energy meter's total at midnight for billing."],
  [22,"Counter Event","1–6","Logged change events for counters. Real example: a record each time a meter's counter is frozen and cleared."],
  [30,"Analog Input","1–6 (16/32-bit, single/double float)","A continuously variable measured value. Real example: a transformer's oil temperature or a line's voltage."],
  [32,"Analog Input Event","1–8 (with/without time)","Logged significant changes to an analog value, filtered by deadband. Real example: a tank level event only logged once it moves more than 0.5%."],
  [40,"Analog Output Status","1–4","Reports the current value of a controllable analog output. Real example: confirming a solar inverter's reactive power setpoint took effect."],
  [41,"Analog Output Command","1–4 (16/32-bit, float)","The object sent to change an analog output's setpoint. Real example: writing a new target setpoint to a solar inverter."],
  [50,"Time and Date","1 (absolute time), 3 (last recorded time)","Used to synchronize the outstation's clock. Real example: correcting an RTU's clock drift so pipeline meter timestamps line up."],
  [52,"Time Delay","1–2","Measures communication delay to refine time synchronization. Real example: accounting for a few hundred milliseconds of network latency before a time-sync write."],
  [60,"Class Objects","1–4 (Class 0–3 data)","A grouping used purely in requests, to ask for a whole event class or the full static database at once. Real example: a Class 0 request during a nightly integrity poll."],
  [70,"File Transfer","2–7 (file command/status/data)","Enables transferring whole files over the DNP3 link. Real example: pushing a firmware update to a remote protective relay."],
  [80,"Internal Indications","1","Carries the device status flag bits included in every response. Real example: the bit that's automatically set after an RTU reboots."],
  [120,"Authentication","1–15 (challenge, reply, key, etc.)","Secure Authentication (SAv5) objects for cryptographic challenge-response. Real example: the HMAC-SHA-256 challenge exchanged before a critical Operate command is accepted."],
];

/* ---------------- SHARED UTILITIES ---------------- */
function escapeHtml(s){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function crc16dnp3(bytes){
  // Uses the reversed DNP3 CRC-16 polynomial (0xA6BC) with init 0xFFFF,
  // matching the standard's CRC-16/DNP characteristics for teaching purposes.
  let crc = 0xFFFF;
  for (const b of bytes){
    crc ^= b;
    for (let i=0;i<8;i++){
      if (crc & 1) crc = (crc >> 1) ^ 0xA6BC;
      else crc = crc >> 1;
    }
  }
  return (~crc) & 0xFFFF;
}

function toHex(n, len){
  return n.toString(16).toUpperCase().padStart(len, '0');
}

/* ---------------- NAVIGATION ---------------- */
const CURRICULUM = [
  {id:'why',        title:'Why DNP3'},
  {id:'how',        title:'How It Works'},
  {id:'compare',    title:'Protocol Comparison'},
  {id:'scenarios',  title:'Real-World Scenarios'},
  {id:'glossary',   title:'Glossary'},
  {id:'functions',  title:'Function Codes'},
  {id:'objects',    title:'Object Groups'},
  {id:'standards',  title:'Standard Values'},
  {id:'visuals',    title:'Visuals'},
  {id:'live',       title:'Live Demo'},
  {id:'builder',    title:'Frame Builder'},
];

function goToSection(tabId){
  document.querySelectorAll('.nav-home, .nav-link').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('main section').forEach(s=>s.classList.remove('active'));

  const targetBtn = document.querySelector(`[data-tab="${tabId}"]`);
  const targetSection = document.getElementById(tabId);
  if (targetBtn) targetBtn.classList.add('active');
  if (targetSection) targetSection.classList.add('active');

  updatePageNav(tabId);
  closeSidebar();
  const mc = document.getElementById('mainContent');
  if (mc) mc.scrollTo({top:0, behavior:'instant' in document.documentElement.style ? 'instant' : 'auto'});
  window.scrollTo(0,0);
}

function updatePageNav(tabId){
  const pageNav = document.getElementById('pageNav');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const progress = document.getElementById('pageProgress');
  if (!pageNav) return;

  const idx = CURRICULUM.findIndex(s => s.id === tabId);
  if (idx === -1){
    // Home dashboard: no linear prev/next controls
    pageNav.classList.add('hidden');
    return;
  }
  pageNav.classList.remove('hidden');

  const prev = idx > 0 ? CURRICULUM[idx-1] : null;
  const next = idx < CURRICULUM.length-1 ? CURRICULUM[idx+1] : null;

  if (prev){
    prevBtn.innerHTML = `<small>← Previous</small>${prev.title}`;
    prevBtn.disabled = false;
    prevBtn.dataset.target = prev.id;
  } else {
    prevBtn.innerHTML = `<small>← Previous</small>Start Here`;
    prevBtn.disabled = false;
    prevBtn.dataset.target = 'home';
  }

  if (next){
    nextBtn.innerHTML = `<small>Next →</small>${next.title}`;
    nextBtn.disabled = false;
    nextBtn.dataset.target = next.id;
  } else {
    nextBtn.innerHTML = `<small>You're done →</small>Back to Start`;
    nextBtn.disabled = false;
    nextBtn.dataset.target = 'home';
  }

  progress.textContent = `Step ${idx+1} of ${CURRICULUM.length}`;
}

function openSidebar(){
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('show');
}
function closeSidebar(){
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

function initNavigation(){
  document.querySelectorAll('.nav-home, .nav-link').forEach(btn=>{
    btn.addEventListener('click', ()=> goToSection(btn.dataset.tab));
  });

  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
  const overlay = document.getElementById('sidebarOverlay');
  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebar);
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  // initialize page-nav state for the default active section (home)
  updatePageNav('home');
}

function initPageNav(){
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (prevBtn) prevBtn.addEventListener('click', ()=> goToSection(prevBtn.dataset.target));
  if (nextBtn) nextBtn.addEventListener('click', ()=> goToSection(nextBtn.dataset.target));
}

function initHomeQuickStart(){
  document.querySelectorAll('.quickstart-card').forEach(card=>{
    card.addEventListener('click', ()=> goToSection(card.dataset.goto));
  });
}

/* ---------------- GLOSSARY ---------------- */
function renderGlossary(){
  const termList = document.getElementById('termList');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const glossCount = document.getElementById('glossCount');

  const categories = [...new Set(terms.map(t=>t.cat))].sort();
  categories.forEach(c=>{
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    categoryFilter.appendChild(o);
  });

  function renderTerms(){
    const q = searchInput.value.trim().toLowerCase();
    const cat = categoryFilter.value;
    const filtered = terms.filter(t=>{
      const matchesQ = !q || t.t.toLowerCase().includes(q) || t.d.toLowerCase().includes(q) || (t.ex && t.ex.toLowerCase().includes(q));
      const matchesCat = !cat || t.cat === cat;
      return matchesQ && matchesCat;
    });
    glossCount.textContent = filtered.length + " terms";
    termList.innerHTML = filtered.map(t=>`
      <div class="term">
        <div class="row">
          <h3>${escapeHtml(t.t)}</h3>
          <span class="cat">${escapeHtml(t.cat)}</span>
        </div>
        <p>${escapeHtml(t.d)}</p>
        ${t.ex ? `<div class="example"><b>Real-world example:</b> ${escapeHtml(t.ex)}</div>` : ''}
      </div>
    `).join('') || '<p style="color:var(--muted)">No matching terms found.</p>';
  }
  searchInput.addEventListener('input', renderTerms);
  categoryFilter.addEventListener('change', renderTerms);
  renderTerms();
}

/* ---------------- FUNCTION CODES TABLE ---------------- */
function renderFunctionCodesTable(){
  const fcTable = document.getElementById('fcTable');
  fcTable.innerHTML = functionCodes.map(f=>{
    const dirBadge = f[2].includes('→ Outstation') ? 'req' : (f[2].includes('Outstation →') ? 'resp' : 'crit');
    return `<tr>
      <td><code>${f[0]}</code></td>
      <td>${escapeHtml(f[1])}</td>
      <td><span class="badge ${dirBadge}">${escapeHtml(f[2])}</span></td>
      <td>${escapeHtml(f[3])}<br><span style="color:var(--muted);font-size:12px;">Example: ${escapeHtml(f[4])}</span></td>
    </tr>`;
  }).join('');
}

/* ---------------- OBJECT GROUPS TABLE ---------------- */
function renderObjectGroupsTable(){
  const ogTable = document.getElementById('ogTable');
  ogTable.innerHTML = objectGroups.map(o=>`
    <tr>
      <td><code>Group ${o[0]}</code></td>
      <td>${escapeHtml(o[1])}</td>
      <td>${escapeHtml(o[2])}</td>
      <td>${escapeHtml(o[3])}</td>
    </tr>
  `).join('');
}

/* ---------------- FRAME BUILDER SIMULATION ---------------- */
function buildFrameSimulation(){
  function buildFrame(){
    const dir = parseInt(document.getElementById('dir').value);
    const prm = parseInt(document.getElementById('prm').value);
    const fc = parseInt(document.getElementById('linkFc').value);
    const dest = Math.min(65535, Math.max(0, parseInt(document.getElementById('destAddr').value) || 0));
    const src = Math.min(65535, Math.max(0, parseInt(document.getElementById('srcAddr').value) || 0));
    const payloadStr = document.getElementById('payload').value.trim();

    let payloadBytes = [];
    if (payloadStr){
      payloadBytes = payloadStr.split(/[\s,]+/).filter(Boolean).map(h => parseInt(h, 16) & 0xFF);
    }

    // Control byte: bit7=DIR, bit6=PRM, bit5=FCB(0), bit4=FCV(0), bits3-0=function code
    const control = (dir<<7) | (prm<<6) | (0<<5) | (0<<4) | (fc & 0x0F);

    const length = 5 + payloadBytes.length; // control+dest(2)+src(2)+payload

    const destLo = dest & 0xFF, destHi = (dest>>8) & 0xFF;
    const srcLo = src & 0xFF, srcHi = (src>>8) & 0xFF;

    const headerBytes = [0x05,0x64, length, control, destLo, destHi, srcLo, srcHi];
    const crc = crc16dnp3(headerBytes);
    const crcLo = crc & 0xFF, crcHi = (crc>>8) & 0xFF;

    const fcNames = {0:'Reset of Remote Link',4:'Unconfirmed User Data',9:'Request Link Status'};

    let out = '';
    out += `<span class="bytefield" style="color:#4f8cff">05 64</span> `;
    out += `<span class="bytefield" style="color:#ffb84f">${toHex(length,2)}</span> `;
    out += `<span class="bytefield" style="color:#3ddc97">${toHex(control,2)}</span> `;
    out += `<span class="bytefield" style="color:#c084fc">${toHex(destLo,2)} ${toHex(destHi,2)}</span> `;
    out += `<span class="bytefield" style="color:#c084fc">${toHex(srcLo,2)} ${toHex(srcHi,2)}</span> `;
    out += `<span class="bytefield" style="color:#ff8fa3">${toHex(crcLo,2)} ${toHex(crcHi,2)}</span>`;

    if (payloadBytes.length){
      out += `\n\nUser Data: <span class="bytefield" style="color:#e6ecf5">${payloadBytes.map(b=>toHex(b,2)).join(' ')}</span>`;
      out += `\n(A real frame follows each 16-byte data block with its own 2-byte CRC — this simplified builder shows the header CRC only.)`;
    }

    out += `\n\n— Control byte breakdown —
    DIR = ${dir}  |  PRM = ${prm}  |  FCB = 0  |  FCV = 0  |  Function = ${fc} (${fcNames[fc] || 'n/a'})
    Destination Address = ${dest}
    Source Address = ${src}
    Frame Length Field = ${length}  (max real-world value: 292 total bytes per frame, 10-byte header + up to 282 bytes of user data)
    Header CRC (CRC-16/DNP algorithm) = ${toHex(crc,4)}`;

    document.getElementById('frameOut').innerHTML = out;
  }

  const buildBtn = document.getElementById('buildFrameBtn');
  if (buildBtn) buildBtn.addEventListener('click', buildFrame);
}

/* ---------------- POLLING SCHEDULE VISUAL ---------------- */
function initPollingSchedule(){
    function addTicks(elId, ticks){
      const el = document.getElementById(elId);
      if (!el) return;
      ticks.forEach(t=>{
        const tick = document.createElement('div');
        tick.className = 'sched-tick';
        tick.style.left = (t/60*100) + '%';
        el.appendChild(tick);
      });
    }
    addTicks('schedC1', Array.from({length:31}, (_,i)=>i*2));
    addTicks('schedC2', [0,10,20,30,40,50,60]);
    addTicks('schedC3', [0,30,60]);
    addTicks('schedC0', [0]);
}

/* ---------------- LIVE SCADA DASHBOARD SIMULATION ---------------- */
function initLiveDashboard(){
    const ledEl = document.getElementById('ledBreaker');
    const ledLabel = document.getElementById('ledLabel');
    const gaugeVal = document.getElementById('gaugeVal');
    const gaugeNeedle = document.getElementById('gaugeNeedle');
    const counterVal = document.getElementById('counterVal');
    const eventLog = document.getElementById('eventLog');
    const chartCanvas = document.getElementById('liveChart');

    if (!ledEl || !chartCanvas) return; // guard if elements not present

    let voltage = 138.0;
    let lastReportedVoltage = 138.0;
    let counter = 128430;
    let tripped = false;
    let tick = 0;
    const history = new Array(60).fill(138.0);

    function addEvent(text, cls){
      const div = document.createElement('div');
      div.className = 'ev ' + (cls||'info');
      const t = new Date();
      const ts = t.toLocaleTimeString();
      div.textContent = `[${ts}] ${text}`;
      eventLog.appendChild(div);
      while (eventLog.children.length > 30) eventLog.removeChild(eventLog.firstChild);
      eventLog.scrollTop = 0;
    }

    function updateGauge(v){
      // map 130-146 kV to -90..+90 degrees
      const min = 130, max = 146;
      const clamped = Math.max(min, Math.min(max, v));
      const pct = (clamped - min) / (max - min);
      const angle = -90 + pct * 180;
      gaugeNeedle.setAttribute('transform', `rotate(${angle} 100 110)`);
      gaugeVal.textContent = v.toFixed(1) + ' kV';
    }

    function drawChart(){
      const ctx = chartCanvas.getContext('2d');
      const w = chartCanvas.width, h = chartCanvas.height;
      ctx.clearRect(0,0,w,h);
      // grid
      ctx.strokeStyle = '#182338';
      ctx.lineWidth = 1;
      for(let i=0;i<=4;i++){
        const y = (h/4)*i;
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
      }
      // line
      const min = 134, max = 142;
      ctx.strokeStyle = '#4f8cff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      history.forEach((v,i)=>{
        const x = (w/(history.length-1)) * i;
        const norm = Math.max(0,Math.min(1,(v-min)/(max-min)));
        const y = h - norm*h;
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.stroke();
      // fill under line
      ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath();
      ctx.fillStyle = 'rgba(79,140,255,0.12)';
      ctx.fill();
    }

    addEvent('Master: Integrity Poll (Class 0) — establishing baseline', 'info');
    addEvent('Response: Binary Output CB-102 = CLOSED', 'ok');
    addEvent('Response: Analog Input Bus Voltage = 138.0 kV', 'ok');
    drawChart();
    updateGauge(voltage);

    setInterval(()=>{
      tick++;

      if (!tripped){
        // normal small random walk in voltage
        voltage += (Math.random()-0.5) * 0.6;
        voltage = Math.max(135, Math.min(141, voltage));
        counter += Math.floor(Math.random()*40)+10;
        counterVal.textContent = counter.toLocaleString();

        // deadband concept: only report/event when change exceeds 0.5%
        if (Math.abs(voltage - lastReportedVoltage) / lastReportedVoltage > 0.005){
          addEvent(`Analog Input Event: Bus Voltage now ${voltage.toFixed(1)} kV (deadband exceeded)`, 'info');
          lastReportedVoltage = voltage;
        }
      }

      history.push(voltage);
      history.shift();
      drawChart();
      updateGauge(voltage);

      // occasionally simulate a breaker trip event
      if (!tripped && tick % 12 === 0){
        tripped = true;
        ledEl.classList.add('tripped');
        ledLabel.textContent = 'CB-102: OPEN (TRIPPED)';
        addEvent('Unsolicited Response (FC 130): CB-102 tripped OPEN — Binary Input Event', 'alarm');
        addEvent('IIN: Event buffer flag set — operator notified', 'alarm');
      } else if (tripped && tick % 12 === 5){
        // restore after select/operate sequence
        tripped = false;
        ledEl.classList.remove('tripped');
        ledLabel.textContent = 'CB-102: CLOSED';
        addEvent('Select (FC 3) accepted — CB-102 close', 'info');
        addEvent('Operate (FC 4) confirmed — CB-102 = CLOSED', 'ok');
      }
    }, 1400);
}

/* ---------------- APP INITIALIZATION ---------------- */
function initApp(){
  initNavigation();
  initPageNav();
  initHomeQuickStart();
  renderGlossary();
  renderFunctionCodesTable();
  renderObjectGroupsTable();
  buildFrameSimulation();
  initPollingSchedule();
  initLiveDashboard();
}

document.addEventListener('DOMContentLoaded', initApp);
