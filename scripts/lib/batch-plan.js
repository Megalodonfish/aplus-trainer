/**
 * Batch plan for generating 500 CompTIA A+ 220-1101 questions.
 *
 * Each batch: { domain, subtopic, count }
 *
 * Domain totals (must equal 500):
 *   Hardware and Network Troubleshooting : 145
 *   Hardware                             : 125
 *   Networking                           : 100
 *   Mobile Devices                       :  75
 *   Virtualization and Cloud Computing   :  55
 */

export const DOMAINS = [
  'Hardware',
  'Networking',
  'Mobile Devices',
  'Virtualization and Cloud Computing',
  'Hardware and Network Troubleshooting',
];

const batchPlan = [
  // ── Hardware (125) ──────────────────────────────────────────────────────────
  { domain: 'Hardware', subtopic: 'CPU types, sockets, and installation (Intel LGA vs AMD AM)', count: 15 },
  { domain: 'Hardware', subtopic: 'RAM types: DDR4, DDR5, DIMM, SODIMM, ECC; slots and speeds', count: 15 },
  { domain: 'Hardware', subtopic: 'Storage devices: HDD, SATA SSD, NVMe M.2, and connectors', count: 15 },
  { domain: 'Hardware', subtopic: 'Motherboard components: chipsets, form factors, BIOS/UEFI, POST', count: 15 },
  { domain: 'Hardware', subtopic: 'Expansion cards: PCIe slots (x1/x4/x16), GPU, NIC, sound cards', count: 15 },
  { domain: 'Hardware', subtopic: 'Power supply: voltage rails, connectors (24-pin, 8-pin EPS, PCIe 6/8-pin), wattage', count: 15 },
  { domain: 'Hardware', subtopic: 'Cooling solutions: air coolers, liquid cooling, thermal paste, case airflow', count: 10 },
  { domain: 'Hardware', subtopic: 'Ports and connectors: USB types, Thunderbolt, video (HDMI/DP/VGA/DVI)', count: 15 },
  { domain: 'Hardware', subtopic: 'Printers: laser, inkjet, thermal, impact — components and maintenance', count: 10 },

  // ── Networking (100) ────────────────────────────────────────────────────────
  { domain: 'Networking', subtopic: 'TCP/IP fundamentals: OSI layers, TCP vs UDP, IP addressing', count: 15 },
  { domain: 'Networking', subtopic: 'DNS, DHCP, and network services (WINS, NTP, SMTP, POP3, IMAP)', count: 15 },
  { domain: 'Networking', subtopic: 'Ports and protocols: common port numbers and their associated services', count: 15 },
  { domain: 'Networking', subtopic: 'Network devices: hubs, switches, routers, access points, firewalls, modems', count: 15 },
  { domain: 'Networking', subtopic: 'Wireless networking: 802.11 standards (a/b/g/n/ac/ax), channels, encryption (WPA2/WPA3)', count: 15 },
  { domain: 'Networking', subtopic: 'Network cables: Cat5e/6/6a/8, fiber (single/multi-mode), connectors, tools', count: 15 },
  { domain: 'Networking', subtopic: 'Network utilities: ping, tracert/traceroute, ipconfig/ifconfig, nslookup, netstat', count: 10 },

  // ── Mobile Devices (75) ─────────────────────────────────────────────────────
  { domain: 'Mobile Devices', subtopic: 'Laptop hardware: CPU, RAM, storage, batteries, expansion slots', count: 15 },
  { domain: 'Mobile Devices', subtopic: 'Laptop display technologies: LCD, IPS, OLED, digitizer, inverter, backlight', count: 15 },
  { domain: 'Mobile Devices', subtopic: 'Mobile connectivity: Wi-Fi, Bluetooth, NFC, cellular (LTE/5G), hotspot, tethering', count: 15 },
  { domain: 'Mobile Devices', subtopic: 'Mobile device accessories: docking stations, port replicators, stylus, protective cases', count: 10 },
  { domain: 'Mobile Devices', subtopic: 'Mobile device synchronization: cloud sync, USB sync, backup methods, MDM', count: 10 },
  { domain: 'Mobile Devices', subtopic: 'Mobile OS features and security: screen locks, remote wipe, app permissions, updates', count: 10 },

  // ── Virtualization and Cloud Computing (55) ─────────────────────────────────
  { domain: 'Virtualization and Cloud Computing', subtopic: 'Cloud service models: IaaS, PaaS, SaaS, and shared responsibility', count: 15 },
  { domain: 'Virtualization and Cloud Computing', subtopic: 'Cloud deployment models: public, private, hybrid, community cloud', count: 10 },
  { domain: 'Virtualization and Cloud Computing', subtopic: 'Hypervisors: Type 1 vs Type 2, VMware, Hyper-V, VirtualBox; VM configuration', count: 15 },
  { domain: 'Virtualization and Cloud Computing', subtopic: 'VM features: snapshots, cloning, live migration, resource allocation, virtual NICs', count: 15 },

  // ── Hardware and Network Troubleshooting (145) ──────────────────────────────
  { domain: 'Hardware and Network Troubleshooting', subtopic: 'POST failures: beep codes, no video, no power, boot errors', count: 15 },
  { domain: 'Hardware and Network Troubleshooting', subtopic: 'RAM troubleshooting: BSOD, POST failures, memtest, seating issues', count: 10 },
  { domain: 'Hardware and Network Troubleshooting', subtopic: 'Storage troubleshooting: HDD/SSD failures, SMART errors, slow performance, clicking', count: 15 },
  { domain: 'Hardware and Network Troubleshooting', subtopic: 'Display troubleshooting: distorted/garbled output, dead pixels, dim display, no signal', count: 15 },
  { domain: 'Hardware and Network Troubleshooting', subtopic: 'Printer troubleshooting: paper jams, print quality, fuser issues, connectivity', count: 15 },
  { domain: 'Hardware and Network Troubleshooting', subtopic: 'Network connectivity troubleshooting: no link, slow speed, IP conflicts, limited connectivity', count: 15 },
  { domain: 'Hardware and Network Troubleshooting', subtopic: 'Wireless network troubleshooting: poor signal, authentication failures, interference', count: 10 },
  { domain: 'Hardware and Network Troubleshooting', subtopic: 'Overheating and power issues: thermal shutdown, fan failures, PSU symptoms', count: 15 },
  { domain: 'Hardware and Network Troubleshooting', subtopic: 'Mobile device troubleshooting: battery drain, touchscreen failures, charging issues, apps crashing', count: 15 },
  { domain: 'Hardware and Network Troubleshooting', subtopic: 'CompTIA 6-step troubleshooting methodology and documentation best practices', count: 10 },
];

// Verify domain totals at module load (development guard)
const domainTotals = {};
for (const batch of batchPlan) {
  domainTotals[batch.domain] = (domainTotals[batch.domain] ?? 0) + batch.count;
}

const EXPECTED = {
  'Hardware': 125,
  'Networking': 100,
  'Mobile Devices': 75,
  'Virtualization and Cloud Computing': 55,
  'Hardware and Network Troubleshooting': 145,
};

const grandTotal = Object.values(domainTotals).reduce((a, b) => a + b, 0);
if (grandTotal !== 500) {
  throw new Error(`batch-plan grand total is ${grandTotal}, expected 500`);
}
for (const [domain, expected] of Object.entries(EXPECTED)) {
  const actual = domainTotals[domain] ?? 0;
  if (actual !== expected) {
    throw new Error(`batch-plan domain "${domain}" total is ${actual}, expected ${expected}`);
  }
}

export default batchPlan;
