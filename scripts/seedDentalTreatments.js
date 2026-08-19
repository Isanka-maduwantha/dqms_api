const dns = require('dns');

dns.setServers([
    '8.8.8.8',
    '1.1.1.1'
]);

const mongoose = require('mongoose');
const env = require('../config/env');
const DentalTreatment = require('../models/DentalTreatment');

const treatments = [
  {
    code: 'CONSULTATION',
    name: 'Dental Consultation',
    category: 'GENERAL',
    price: 1000,
    aliases: ['Dental Check Up', 'Checkup', 'Check Up'],
    description: 'Routine dental consultation and examination.',
  },
  {
    code: 'SCALING',
    name: 'Full Mouth Scaling and Polishing',
    category: 'PREVENTIVE',
    price: 5000,
    description: 'Full mouth dental cleaning with scaling and polishing.',
  },
  {
    code: 'DEEP_CLEANING',
    name: 'Deep Cleaning',
    category: 'PERIODONTAL',
    price: 10000,
    description: 'Deep periodontal cleaning.',
  },
  {
    code: 'COMPOSITE_FILLING',
    name: 'Composite Filling',
    category: 'RESTORATIVE',
    price: 5000,
    description: 'Tooth-coloured composite restoration.',
  },
  {
    code: 'TEMP_FILLING',
    name: 'Temporary Filling',
    category: 'RESTORATIVE',
    price: 2500,
    description: 'Temporary dental restoration.',
  },
  {
    code: 'ROOT_CANAL',
    name: 'Root Canal Treatment',
    category: 'ENDODONTIC',
    price: 5000,
    aliases: ['Root Canal', 'Nerve Filling'],
    description: 'Root canal treatment. Initial demo clinic price; update in the database when the clinic sets its final tariff.',
  },
  {
    code: 'CORE_BUILDUP',
    name: 'Core Buildup',
    category: 'RESTORATIVE',
    price: 15000,
    description: 'Core buildup, with or without fibre post as clinically required.',
  },
  {
    code: 'SIMPLE_EXTRACTION',
    name: 'Simple Tooth Extraction',
    category: 'ORAL_SURGERY',
    price: 5000,
    aliases: ['Tooth Extraction', 'Extraction'],
    description: 'Simple tooth extraction.',
  },
  {
    code: 'SURGICAL_EXTRACTION',
    name: 'Surgical Tooth Extraction',
    category: 'ORAL_SURGERY',
    price: 10000,
    description: 'Surgical extraction; final clinic tariff can be adjusted.',
  },
  {
    code: 'WISDOM_EXTRACTION',
    name: 'Wisdom Tooth Extraction',
    category: 'ORAL_SURGERY',
    price: 15000,
    description: 'Wisdom tooth extraction; complex cases may require a higher clinic tariff.',
  },
  {
    code: 'METAL_CROWN',
    name: 'Metal Crown',
    category: 'PROSTHODONTIC',
    price: 25000,
    description: 'Dental metal crown.',
  },
  {
    code: 'PORCELAIN_CROWN',
    name: 'Porcelain Crown',
    category: 'PROSTHODONTIC',
    price: 45000,
    description: 'Porcelain/PFM dental crown.',
  },
  {
    code: 'ZIRCONIA_CROWN',
    name: 'Zirconia Crown',
    category: 'PROSTHODONTIC',
    price: 55000,
    description: 'Zirconia dental crown.',
  },
  {
    code: 'ORTHO_BRACKET_PLACEMENT',
    name: 'Orthodontic Bracket Placement',
    category: 'ORTHODONTIC',
    price: 50000,
    aliases: ['Orthodontic Bond Up', 'Bracket Placement'],
    description: 'Initial orthodontic bracket bonding/bond-up service.',
  },
  {
    code: 'ORTHO_ADJUSTMENT',
    name: 'Orthodontic Adjustment',
    category: 'ORTHODONTIC',
    price: 5000,
    aliases: ['Braces Adjustment', 'Orthodontic Review'],
    description: 'Routine orthodontic adjustment visit.',
  },
  {
    code: 'TEETH_WHITENING',
    name: 'Professional Teeth Whitening',
    category: 'COSMETIC',
    price: 18000,
    description: 'Professional in-clinic teeth whitening.',
  },
  {
    code: 'DENTURE',
    name: 'Complete Denture',
    category: 'PROSTHODONTIC',
    price: 22000,
    description: 'Complete denture; clinic may set different upper/lower or material prices.',
  },
  {
    code: 'DENTAL_IMPLANT',
    name: 'Dental Implant',
    category: 'IMPLANT',
    price: 135000,
    description: 'Dental implant procedure; crown/lab components may be priced separately if the clinic chooses.',
  },
];

async function seed() {
  await mongoose.connect(env.CONNECTION_URL);
  console.log('Connected to MongoDB.');

  for (const treatment of treatments) {
    await DentalTreatment.findOneAndUpdate(
      { code: treatment.code },
      {
        $set: {
          name: treatment.name,
          category: treatment.category,
          description: treatment.description,
          price: treatment.price,
          aliases: treatment.aliases || [],
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  console.log(`Seeded ${treatments.length} dental treatment types.`);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('Failed to seed dental treatments:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
