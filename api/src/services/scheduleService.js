const recordService = require('./recordService');

const SLOTS = ['Morning', 'Afternoon', 'Night', 'Multiple'];

/**
 * Builds a Morning/Afternoon/Night medicine schedule from every uploaded
 * prescription/lab record that contains medicines, most recent first.
 */
async function getSchedule(userId) {
  const records = await recordService.listRecords(userId);

  const schedule = { Morning: [], Afternoon: [], Night: [], Multiple: [] };

  for (const record of records) {
    for (const med of record.medicines || []) {
      const slot = SLOTS.includes(med.timing) ? med.timing : 'Multiple';
      schedule[slot].push({
        recordId: record.id,
        docType: record.docType,
        source: record.fileName,
        addedOn: record.documentDate || record.uploadedAt.slice(0, 10),
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
      });
    }
  }

  return schedule;
}

module.exports = { getSchedule };
