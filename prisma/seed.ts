import {
  CategorieOperationFonciere,
  PrismaClient,
} from "@prisma/client";

import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const DATE_DEBUT_REGLEMENTATION = new Date(
  "2021-06-10T00:00:00.000Z"
);

const REFERENCE_REGLEMENTAIRE =
  "Décret gouvernemental n° 2021-427 du 10 juin 2021";


// ============================================================
// GOUVERNORATS
// ============================================================

const gouvernorats = [
  { code: "TUNIS", nom: "Tunis" },
  { code: "ARIANA", nom: "Ariana" },
  { code: "BEN_AROUS", nom: "Ben Arous" },
  { code: "MANOUBA", nom: "La Manouba" },
  { code: "NABEUL", nom: "Nabeul" },
  { code: "ZAGHOUAN", nom: "Zaghouan" },
  { code: "BIZERTE", nom: "Bizerte" },
  { code: "BEJA", nom: "Béja" },
  { code: "JENDOUBA", nom: "Jendouba" },
  { code: "LE_KEF", nom: "Le Kef" },
  { code: "SILIANA", nom: "Siliana" },
  { code: "SOUSSE", nom: "Sousse" },
  { code: "MONASTIR", nom: "Monastir" },
  { code: "MAHDIA", nom: "Mahdia" },
  { code: "SFAX", nom: "Sfax" },
  { code: "KAIROUAN", nom: "Kairouan" },
  { code: "KASSERINE", nom: "Kasserine" },
  { code: "SIDI_BOUZID", nom: "Sidi Bouzid" },
  { code: "GABES", nom: "Gabès" },
  { code: "MEDENINE", nom: "Médenine" },
  { code: "TATAOUINE", nom: "Tataouine" },
  { code: "GAFSA", nom: "Gafsa" },
  { code: "TOZEUR", nom: "Tozeur" },
  { code: "KEBILI", nom: "Kébili" },
];


// ============================================================
// TYPES D'OPERATIONS FONCIERES
// ============================================================

const operationsFoncieres = [
  {
    code: "VENTE",
    libelle: "Vente",
    description: "Inscription d'une opération de vente.",
    categorie: CategorieOperationFonciere.STANDARD,
  },
  {
    code: "HYPOTHEQUE",
    libelle: "Hypothèque",
    description: "Inscription d'une opération d'hypothèque.",
    categorie: CategorieOperationFonciere.STANDARD,
  },
  {
    code: "DONATION",
    libelle: "Donation",
    description: "Inscription d'une opération de donation.",
    categorie: CategorieOperationFonciere.STANDARD,
  },
  {
    code: "SUCCESSION",
    libelle: "Succession",
    description: "Inscription relative à une succession.",
    categorie: CategorieOperationFonciere.STANDARD,
  },
  {
    code: "RADIATION",
    libelle: "Radiation",
    description: "Opération de radiation d'une inscription.",
    categorie: CategorieOperationFonciere.STANDARD,
  },
  {
    code: "MAINLEVEE",
    libelle: "Mainlevée",
    description: "Opération de mainlevée.",
    categorie: CategorieOperationFonciere.STANDARD,
  },
  {
    code: "ECHANGE",
    libelle: "Échange",
    description: "Inscription d'une opération d'échange.",
    categorie: CategorieOperationFonciere.STANDARD,
  },
  {
    code: "PARTAGE",
    libelle: "Partage",
    description: "Inscription d'une opération de partage.",
    categorie: CategorieOperationFonciere.STANDARD,
  },
  {
    code: "DISTRACTION",
    libelle: "Distraction",
    description: "Opération foncière de distraction.",
    categorie: CategorieOperationFonciere.DISTRACTION,
  },
];


// ============================================================
// PRESTATIONS
// ============================================================

const prestations = [
  {
    code: "CREATION_TITRE_FONCIER",
    libelle: "Création d'un titre foncier",
    description: "Création d'un nouveau titre foncier.",
    tarificationParPage: false,
    supplementFrancaisApplicable: false,
    necessiteTitreFoncier: false,
    montantBase: "50.000",
    montantParPage: "0.000",
    supplementFrancais: "0.000",
  },

  {
    code: "DELIVRANCE_TITRE_PROPRIETE",
    libelle: "Délivrance d'un titre de propriété",
    description: "Délivrance d'un titre de propriété.",
    tarificationParPage: true,
    supplementFrancaisApplicable: false,
    necessiteTitreFoncier: true,
    montantBase: "45.000",
    montantParPage: "3.000",
    supplementFrancais: "0.000",
  },

  {
    code: "CERTIFICAT_PROPRIETE",
    libelle: "Certificat de propriété",
    description: "Délivrance d'un certificat de propriété.",
    tarificationParPage: true,
    supplementFrancaisApplicable: true,
    necessiteTitreFoncier: true,
    montantBase: "20.000",
    montantParPage: "3.000",
    supplementFrancais: "30.000",
  },

  {
    code: "CERTIFICAT_COPROPRIETE",
    libelle: "Certificat de copropriété",
    description: "Délivrance d'un certificat de copropriété.",
    tarificationParPage: true,
    supplementFrancaisApplicable: true,
    necessiteTitreFoncier: true,
    montantBase: "20.000",
    montantParPage: "3.000",
    supplementFrancais: "30.000",
  },

  {
    code: "CERTIFICAT_NON_PROPRIETE",
    libelle: "Certificat de non-propriété",
    description: "Délivrance d'un certificat de non-propriété.",
    tarificationParPage: true,
    supplementFrancaisApplicable: true,
    necessiteTitreFoncier: false,
    montantBase: "20.000",
    montantParPage: "3.000",
    supplementFrancais: "30.000",
  },

  {
    code: "PHOTOCOPIE_ACTE_ARCHIVE",
    libelle: "Photocopie d'un acte déposé aux archives",
    description:
      "Photocopie d'un acte conservé dans les archives foncières.",
    tarificationParPage: true,
    supplementFrancaisApplicable: false,
    necessiteTitreFoncier: true,
    montantBase: "0.000",
    montantParPage: "20.000",
    supplementFrancais: "0.000",
  },

  {
    code: "PHOTOCOPIE_TITRE_SIMPLE",
    libelle: "Photocopie simple d'un titre foncier",
    description: "Photocopie simple d'un titre foncier.",
    tarificationParPage: true,
    supplementFrancaisApplicable: false,
    necessiteTitreFoncier: true,
    montantBase: "0.000",
    montantParPage: "2.000",
    supplementFrancais: "0.000",
  },

  {
    code: "PHOTOCOPIE_TITRE_CERTIFIEE",
    libelle: "Photocopie certifiée conforme d'un titre foncier",
    description:
      "Photocopie d'un titre foncier avec certification conforme.",
    tarificationParPage: true,
    supplementFrancaisApplicable: false,
    necessiteTitreFoncier: true,
    montantBase: "30.000",
    montantParPage: "2.000",
    supplementFrancais: "0.000",
  },

  {
    code: "ATTESTATION_REFERENCES_ENREGISTREMENT",
    libelle:
      "Attestation portant sur les références d'enregistrement d'un acte inscrit",
    description:
      "Attestation relative aux références d'enregistrement d'un acte inscrit.",
    tarificationParPage: false,
    supplementFrancaisApplicable: false,
    necessiteTitreFoncier: true,
    montantBase: "20.000",
    montantParPage: "0.000",
    supplementFrancais: "0.000",
  },

  {
    code: "CONSULTATION_TITRE_DIRECTE",
    libelle: "Consultation directe d'un titre foncier",
    description: "Consultation directe d'un titre foncier.",
    tarificationParPage: false,
    supplementFrancaisApplicable: false,
    necessiteTitreFoncier: true,
    montantBase: "3.000",
    montantParPage: "0.000",
    supplementFrancais: "0.000",
  },

  {
    code: "CONSULTATION_TITRE_EN_LIGNE",
    libelle: "Consultation en ligne d'un titre foncier",
    description: "Consultation en ligne d'un titre foncier.",
    tarificationParPage: false,
    supplementFrancaisApplicable: false,
    necessiteTitreFoncier: true,
    montantBase: "5.000",
    montantParPage: "0.000",
    supplementFrancais: "0.000",
  },

  {
    code: "CONSULTATION_LISTE_OPERATIONS_EN_COURS",
    libelle: "Consultation de la liste des opérations en cours",
    description:
      "Consultation de la liste des opérations foncières en cours.",
    tarificationParPage: true,
    supplementFrancaisApplicable: false,
    necessiteTitreFoncier: true,
    montantBase: "0.000",
    montantParPage: "3.000",
    supplementFrancais: "0.000",
  },

  {
    code: "ETAT_INSCRIPTIONS_DETTES",
    libelle: "État des inscriptions relatives aux dettes",
    description:
      "État des inscriptions relatives aux dettes grevant le titre foncier.",
    tarificationParPage: true,
    supplementFrancaisApplicable: false,
    necessiteTitreFoncier: true,
    montantBase: "20.000",
    montantParPage: "3.000",
    supplementFrancais: "0.000",
  },

  {
    code: "CERTIFICAT_INSCRIPTION_TRANSFERT",
    libelle: "Certificat d'inscription de transfert",
    description: "Délivrance d'un certificat d'inscription de transfert.",
    tarificationParPage: true,
    supplementFrancaisApplicable: false,
    necessiteTitreFoncier: true,
    montantBase: "20.000",
    montantParPage: "3.000",
    supplementFrancais: "0.000",
  },

  {
    code: "CERTIFICAT_INSCRIPTION",
    libelle: "Certificat d'inscription",
    description: "Délivrance d'un certificat d'inscription.",
    tarificationParPage: true,
    supplementFrancaisApplicable: false,
    necessiteTitreFoncier: true,
    montantBase: "20.000",
    montantParPage: "3.000",
    supplementFrancais: "0.000",
  },

  {
    code: "REPORT_INSCRIPTION",
    libelle: "Report d'inscription",
    description: "Report d'une inscription foncière.",
    tarificationParPage: false,
    supplementFrancaisApplicable: false,
    necessiteTitreFoncier: true,
    montantBase: "10.000",
    montantParPage: "0.000",
    supplementFrancais: "0.000",
  },
];


// ============================================================
// HELPERS TARIFAIRES
// ============================================================

async function enregistrerTarifInscription() {
  const tarifExistant = await prisma.tarifInscription.findFirst({
    where: {
      dateDebutValidite: DATE_DEBUT_REGLEMENTATION,
    },
  });

  if (tarifExistant) {
    await prisma.tarifInscription.update({
      where: {
        id: tarifExistant.id,
      },
      data: {
        montantArchivage: "20.000",
        dateFinValidite: null,
        referenceReglementaire: REFERENCE_REGLEMENTAIRE,
      },
    });

    return;
  }

  await prisma.tarifInscription.create({
    data: {
      montantArchivage: "20.000",
      dateDebutValidite: DATE_DEBUT_REGLEMENTATION,
      dateFinValidite: null,
      referenceReglementaire: REFERENCE_REGLEMENTAIRE,
    },
  });
}


async function enregistrerTarifOperation(
  categorie: CategorieOperationFonciere,
  montantEtude: string
) {
  const tarifExistant =
    await prisma.tarifOperationFonciere.findFirst({
      where: {
        categorie,
        dateDebutValidite: DATE_DEBUT_REGLEMENTATION,
      },
    });

  if (tarifExistant) {
    await prisma.tarifOperationFonciere.update({
      where: {
        id: tarifExistant.id,
      },
      data: {
        montantEtude,
        dateFinValidite: null,
        referenceReglementaire: REFERENCE_REGLEMENTAIRE,
      },
    });

    return;
  }

  await prisma.tarifOperationFonciere.create({
    data: {
      categorie,
      montantEtude,
      dateDebutValidite: DATE_DEBUT_REGLEMENTATION,
      dateFinValidite: null,
      referenceReglementaire: REFERENCE_REGLEMENTAIRE,
    },
  });
}


async function enregistrerTarifPrestation(
  prestationId: string,
  montantBase: string,
  montantParPage: string,
  supplementFrancais: string
) {
  const tarifExistant = await prisma.tarifPrestation.findFirst({
    where: {
      prestationId,
      dateDebutValidite: DATE_DEBUT_REGLEMENTATION,
    },
  });

  if (tarifExistant) {
    await prisma.tarifPrestation.update({
      where: {
        id: tarifExistant.id,
      },
      data: {
        montantBase,
        montantParPage,
        supplementFrancais,
        dateFinValidite: null,
        referenceReglementaire: REFERENCE_REGLEMENTAIRE,
      },
    });

    return;
  }

  await prisma.tarifPrestation.create({
    data: {
      prestationId,
      montantBase,
      montantParPage,
      supplementFrancais,
      dateDebutValidite: DATE_DEBUT_REGLEMENTATION,
      dateFinValidite: null,
      referenceReglementaire: REFERENCE_REGLEMENTAIRE,
    },
  });
}


// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("🌱 Début du seed ONPF...");


  // ==========================================================
  // 1. ROLES
  // ==========================================================

  console.log("➡️ Création / mise à jour des rôles...");

  const adminRole = await prisma.role.upsert({
    where: {
      nom: "ADMIN",
    },
    update: {
      description: "Administrateur du système",
    },
    create: {
      nom: "ADMIN",
      description: "Administrateur du système",
    },
  });

  await prisma.role.upsert({
    where: {
      nom: "AGENT",
    },
    update: {
      description: "Agent chargé de la création des demandes",
    },
    create: {
      nom: "AGENT",
      description: "Agent chargé de la création des demandes",
    },
  });

  await prisma.role.upsert({
    where: {
      nom: "RESPONSABLE",
    },
    update: {
      description:
        "Responsable Guichet chargé du contrôle et de la validation des demandes",
    },
    create: {
      nom: "RESPONSABLE",
      description:
        "Responsable Guichet chargé du contrôle et de la validation des demandes",
    },
  });

  await prisma.role.upsert({
    where: {
      nom: "CAISSIER",
    },
    update: {
      description: "Agent chargé de l'encaissement des paiements",
    },
    create: {
      nom: "CAISSIER",
      description: "Agent chargé de l'encaissement des paiements",
    },
  });

  await prisma.role.upsert({
    where: {
      nom: "RESPONSABLE_INSCRIPTIONS",
    },
    update: {
      description:
        "Responsable chargé de la distribution et de la clôture des opérations du service d'étude",
    },
    create: {
      nom: "RESPONSABLE_INSCRIPTIONS",
      description:
        "Responsable chargé de la distribution et de la clôture des opérations du service d'étude",
    },
  });

  await prisma.role.upsert({
    where: {
      nom: "REDACTEUR",
    },
    update: {
      description:
        "Agent chargé de l'étude initiale des opérations foncières et de la préparation des minutes ou motifs de refus",
    },
    create: {
      nom: "REDACTEUR",
      description:
        "Agent chargé de l'étude initiale des opérations foncières et de la préparation des minutes ou motifs de refus",
    },
  });

  await prisma.role.upsert({
    where: {
      nom: "VERIFICATEUR",
    },
    update: {
      description:
        "Agent chargé de la vérification des avis et travaux du Rédacteur",
    },
    create: {
      nom: "VERIFICATEUR",
      description:
        "Agent chargé de la vérification des avis et travaux du Rédacteur",
    },
  });

  await prisma.role.upsert({
    where: {
      nom: "SUPER_VERIFICATEUR",
    },
    update: {
      description:
        "Agent chargé du contrôle final et de la décision définitive sur les opérations étudiées",
    },
    create: {
      nom: "SUPER_VERIFICATEUR",
      description:
        "Agent chargé du contrôle final et de la décision définitive sur les opérations étudiées",
    },
  });

  console.log("✅ Rôles enregistrés.");


  // ==========================================================
  // 2. ADMINISTRATEUR
  // ==========================================================

  console.log("➡️ Vérification du compte administrateur...");

  const existingAdmin = await prisma.utilisateur.findUnique({
    where: {
      login: "admin",
    },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(
      "admin123",
      10
    );

    await prisma.utilisateur.create({
      data: {
        nom: "Administrateur",
        prenom: "Système",
        email: "admin@onpf.local",
        telephone: "00000000",
        login: "admin",
        password: hashedPassword,
        statut: true,
        roleId: adminRole.id,
      },
    });

    console.log("✅ Administrateur créé.");
  } else {
    console.log(
      "ℹ️ L'administrateur existe déjà."
    );
  }


  // ==========================================================
  // 3. GOUVERNORATS
  // ==========================================================

  console.log(
    "➡️ Enregistrement des gouvernorats..."
  );

  for (const gouvernorat of gouvernorats) {
    await prisma.gouvernorat.upsert({
      where: {
        code: gouvernorat.code,
      },
      update: {
        nom: gouvernorat.nom,
        actif: true,
      },
      create: {
        code: gouvernorat.code,
        nom: gouvernorat.nom,
        actif: true,
      },
    });
  }

  console.log(
    `✅ ${gouvernorats.length} gouvernorats enregistrés.`
  );


  // ==========================================================
  // 4. OPERATIONS FONCIERES
  // ==========================================================

  console.log(
    "➡️ Enregistrement des opérations foncières..."
  );

  for (const operation of operationsFoncieres) {
    await prisma.typeOperationFonciere.upsert({
      where: {
        code: operation.code,
      },
      update: {
        libelle: operation.libelle,
        description: operation.description,
        categorie: operation.categorie,
        actif: true,
      },
      create: {
        code: operation.code,
        libelle: operation.libelle,
        description: operation.description,
        categorie: operation.categorie,
        actif: true,
      },
    });
  }

  console.log(
    `✅ ${operationsFoncieres.length} opérations foncières enregistrées.`
  );


  // ==========================================================
  // 5. TARIFICATION DES INSCRIPTIONS
  // ==========================================================

  console.log(
    "➡️ Enregistrement des tarifs d'inscription..."
  );

  await enregistrerTarifInscription();

  await enregistrerTarifOperation(
    CategorieOperationFonciere.STANDARD,
    "30.000"
  );

  await enregistrerTarifOperation(
    CategorieOperationFonciere.DISTRACTION,
    "10.000"
  );

  console.log(
    "✅ Tarifs d'inscription enregistrés."
  );


  // ==========================================================
  // 6. PRESTATIONS ET TARIFS
  // ==========================================================

  console.log(
    "➡️ Enregistrement des prestations..."
  );

  for (const prestationData of prestations) {
    const prestation =
      await prisma.prestation.upsert({
        where: {
          code: prestationData.code,
        },
        update: {
          libelle: prestationData.libelle,
          description: prestationData.description,
          tarificationParPage:
            prestationData.tarificationParPage,
          supplementFrancaisApplicable:
            prestationData.supplementFrancaisApplicable,
          necessiteTitreFoncier:
            prestationData.necessiteTitreFoncier,
          actif: true,
        },
        create: {
          code: prestationData.code,
          libelle: prestationData.libelle,
          description: prestationData.description,
          tarificationParPage:
            prestationData.tarificationParPage,
          supplementFrancaisApplicable:
            prestationData.supplementFrancaisApplicable,
          necessiteTitreFoncier:
            prestationData.necessiteTitreFoncier,
          actif: true,
        },
      });

    await enregistrerTarifPrestation(
      prestation.id,
      prestationData.montantBase,
      prestationData.montantParPage,
      prestationData.supplementFrancais
    );
  }

  console.log(
    `✅ ${prestations.length} prestations et leurs tarifs enregistrés.`
  );


  // ==========================================================
  // FIN
  // ==========================================================

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "✅ SEED ONPF TERMINÉ AVEC SUCCÈS"
  );
  console.log(
    "=========================================="
  );
  console.log(
    `Gouvernorats : ${gouvernorats.length}`
  );
  console.log(
    `Opérations foncières : ${operationsFoncieres.length}`
  );
  console.log(
    `Prestations : ${prestations.length}`
  );
  console.log(
    "Archivage inscription : 20 DT"
  );
  console.log(
    "Opération standard : 30 DT"
  );
  console.log(
    "Distraction : 10 DT"
  );
}


// ============================================================
// EXECUTION
// ============================================================

main()
  .catch((error) => {
    console.error(
      "❌ Erreur pendant le seed :",
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });