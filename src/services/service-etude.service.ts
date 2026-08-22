import {
  DecisionAvisEtude,
  ModePreparationMinute,
  NatureDemande,
  NiveauAvisEtude,
  Prisma,
  StatutDemande,
  StatutEtudeOperation,
  StatutJournalCloture,
} from "@prisma/client";

import {
  AppError,
} from "../errors/AppError";

import {
  ServiceEtudeRepository,
} from "../repositories/service-etude.repository";

import {
  UserRepository,
} from "../repositories/user.repository";

import type {
  DistribuerDossierEtudeDto,
  EnregistrerAvisRedacteurDto,
  EnregistrerAvisSuperVerificateurDto,
  EnregistrerAvisVerificateurDto,
  ListAgentsAffectablesDto,
  ListDemandesADistribuerDto,
  ListDossiersRedacteurDto,
  ListDossiersSuperVerificateurDto,
  ListDossiersVerificateurDto,
  ModifierMinuteSuperVerificateurDto,
} from "../validations/service-etude.validation";

export class ServiceEtudeService {
  private serviceEtudeRepository =
    new ServiceEtudeRepository();

  private userRepository =
    new UserRepository();

  private assertResponsableInscriptions(
    role: string
  ): void {
    if (
      role === "ADMIN" ||
      role ===
        "RESPONSABLE_INSCRIPTIONS"
    ) {
      return;
    }

    throw new AppError(
      "Vous n’êtes pas autorisé à accéder à la distribution du service d’étude.",
      403
    );
  }

  private assertRedacteur(
    role: string
  ): void {
    if (role === "REDACTEUR") {
      return;
    }

    throw new AppError(
      "Vous n’êtes pas autorisé à accéder à l’espace du Rédacteur.",
      403
    );
  }

  /**
   * Retourne la journée administrative courante
   * en Tunisie sous la forme d'une Date @db.Date.
   */
  private getTodayDatabaseDateInTunisia():
    Date {
    const parts =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone: "Africa/Tunis",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      ).formatToParts(
        new Date()
      );

    const year =
      parts.find(
        (part) =>
          part.type === "year"
      )?.value;

    const month =
      parts.find(
        (part) =>
          part.type === "month"
      )?.value;

    const day =
      parts.find(
        (part) =>
          part.type === "day"
      )?.value;

    if (
      !year ||
      !month ||
      !day
    ) {
      throw new AppError(
        "Impossible de déterminer la date administrative actuelle.",
        500
      );
    }

    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day)
      )
    );
  }

  private parseDatabaseDate(
    value: string
  ): Date {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})$/.exec(
        value
      );

    if (!match) {
      throw new AppError(
        "La date de clôture est invalide.",
        400
      );
    }

    const year =
      Number(match[1]);

    const month =
      Number(match[2]);

    const day =
      Number(match[3]);

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );

    const valid =
      date.getUTCFullYear() ===
        year &&
      date.getUTCMonth() ===
        month - 1 &&
      date.getUTCDate() ===
        day;

    if (!valid) {
      throw new AppError(
        "La date de clôture est invalide.",
        400
      );
    }

    return date;
  }

  /**
   * Liste des demandes d'inscription disponibles
   * pour une distribution par le Responsable des
   * inscriptions.
   */
  async findDemandesADistribuer(
    query:
      ListDemandesADistribuerDto,
    role: string
  ) {
    this.assertResponsableInscriptions(
      role
    );

    const today =
      this.getTodayDatabaseDateInTunisia();

    const dateCloture =
      query.dateCloture
        ? this.parseDatabaseDate(
            query.dateCloture
          )
        : undefined;

    /*
     * Une journée clôturée aujourd'hui ne devient
     * distribuable qu'à partir du lendemain.
     */
    if (
      dateCloture &&
      dateCloture.getTime() >=
        today.getTime()
    ) {
      throw new AppError(
        "La distribution ne peut concerner que des demandes clôturées avant aujourd’hui.",
        400
      );
    }

    const result =
      await this
        .serviceEtudeRepository
        .findDemandesADistribuer({
          page:
            query.page,

          limit:
            query.limit,

          search:
            query.search,

          dateCloture,

          maxDateClotureExclusive:
            today,
        });

    return {
      demandes:
        result.data,

      meta: {
        total:
          result.total,

        page:
          result.page,

        limit:
          result.limit,

        totalPages:
          result.totalPages,
      },
    };
  }

  /**
   * Retourne les agents actifs pouvant être
   * sélectionnés lors d'une future distribution.
   *
   * Cette route reste en lecture seule pour cette
   * première étape.
   */
  async findAgentsAffectables(
    query:
      ListAgentsAffectablesDto,
    role: string
  ) {
    this.assertResponsableInscriptions(
      role
    );

    return this.userRepository
      .findActiveByRoleName(
        query.role
      );
  }

  /*
   * Distribue une demande d'inscription à une
   * équipe complète du service d'étude.
   */
  async distribuer(
    data:
      DistribuerDossierEtudeDto,
    distribueParId: string,
    role: string
  ) {
    this.assertResponsableInscriptions(
      role
    );

    const today =
      this.getTodayDatabaseDateInTunisia();

    const demande =
      await this
        .serviceEtudeRepository
        .findDemandePourDistribution(
          data.demandeId
        );

    if (!demande) {
      throw new AppError(
        "Demande introuvable.",
        404
      );
    }

    if (
      demande.nature !==
      NatureDemande.INSCRIPTION
    ) {
      throw new AppError(
        "Seules les demandes d’inscription peuvent être distribuées au service d’étude.",
        400
      );
    }

    if (
      demande.statut !==
      StatutDemande.VALIDEE
    ) {
      throw new AppError(
        "La demande doit être validée au guichet avant sa distribution.",
        409
      );
    }

    if (
      demande.dossierEtude
    ) {
      throw new AppError(
        "Cette demande a déjà été distribuée au service d’étude.",
        409
      );
    }

    if (
      !demande.journalCloture
    ) {
      throw new AppError(
        "La demande doit appartenir à une journée clôturée au guichet avant sa distribution.",
        409
      );
    }

    if (
      demande.journalCloture
        .statut !==
      StatutJournalCloture.CLOTURE
    ) {
      throw new AppError(
        "La journée du guichet correspondant à cette demande n’est pas actuellement clôturée.",
        409
      );
    }

    if (
      demande.journalCloture
        .dateJour.getTime() >=
      today.getTime()
    ) {
      throw new AppError(
        "Cette demande ne pourra être distribuée qu’à partir du lendemain de sa journée de clôture au guichet.",
        409
      );
    }

    if (
      demande.operationsFoncieres
        .length === 0
    ) {
      throw new AppError(
        "La demande ne contient aucune opération foncière à étudier.",
        409
      );
    }

    const [
      redacteur,
      verificateur,
      superVerificateur,
    ] = await Promise.all([
      this.userRepository.findById(
        data.redacteurId
      ),

      this.userRepository.findById(
        data.verificateurId
      ),

      this.userRepository.findById(
        data.superVerificateurId
      ),
    ]);

    if (
      !redacteur ||
      !redacteur.statut ||
      redacteur.role.nom !==
        "REDACTEUR"
    ) {
      throw new AppError(
        "L’utilisateur sélectionné comme Rédacteur doit être actif et posséder le rôle REDACTEUR.",
        400
      );
    }

    if (
      !verificateur ||
      !verificateur.statut ||
      verificateur.role.nom !==
        "VERIFICATEUR"
    ) {
      throw new AppError(
        "L’utilisateur sélectionné comme Vérificateur doit être actif et posséder le rôle VERIFICATEUR.",
        400
      );
    }

    if (
      !superVerificateur ||
      !superVerificateur.statut ||
      superVerificateur.role.nom !==
        "SUPER_VERIFICATEUR"
    ) {
      throw new AppError(
        "L’utilisateur sélectionné comme Super-vérificateur doit être actif et posséder le rôle SUPER_VERIFICATEUR.",
        400
      );
    }

    try {
      return await this
        .serviceEtudeRepository
        .createDistribution({
          demandeId:
            data.demandeId,

          distribueParId,

          redacteurId:
            data.redacteurId,

          verificateurId:
            data.verificateurId,

          superVerificateurId:
            data.superVerificateurId,

          operationIds:
            demande
              .operationsFoncieres
              .map(
                (operation) =>
                  operation.id
              ),
        });
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "Cette demande a déjà été distribuée au service d’étude.",
          409
        );
      }

      throw error;
    }
  }


  /*
   * Liste des dossiers actuellement affectés au
   * Rédacteur connecté.
   *
   * Les opérations à traiter par le Rédacteur sont :
   * - EN_REDACTION ;
   * - A_CORRIGER_REDACTEUR.
   *
   * Les autres opérations restent visibles pour
   * permettre le suivi du dossier sans autoriser
   * leur traitement à ce niveau.
   */
  async findDossiersRedacteur(
    query:
      ListDossiersRedacteurDto,
    utilisateurId: string,
    role: string
  ) {
    this.assertRedacteur(
      role
    );

    const result =
      await this
        .serviceEtudeRepository
        .findDossiersRedacteur({
          utilisateurId,

          page:
            query.page,

          limit:
            query.limit,

          search:
            query.search,
        });

    const dossiers =
      result.data.map(
        (dossier) => {
          const operationsATraiter =
            dossier.etudesOperations.filter(
              (operation) =>
                operation.statut ===
                  StatutEtudeOperation.EN_REDACTION ||
                operation.statut ===
                  StatutEtudeOperation.A_CORRIGER_REDACTEUR
            ).length;

          return {
            ...dossier,

            resume: {
              operationsTotal:
                dossier
                  .etudesOperations
                  .length,

              operationsATraiter,
            },
          };
        }
      );

    return {
      dossiers,

      meta: {
        total:
          result.total,

        page:
          result.page,

        limit:
          result.limit,

        totalPages:
          result.totalPages,
      },
    };
  }


  async findDossierRedacteurById(
    dossierId: string,
    utilisateurId: string,
    role: string
  ) {
    this.assertRedacteur(
      role
    );

    const dossier =
      await this
        .serviceEtudeRepository
        .findDossierRedacteurById(
          dossierId,
          utilisateurId
        );

    if (!dossier) {
      throw new AppError(
        "Dossier introuvable ou non affecté à ce Rédacteur.",
        404
      );
    }

    const operationsATraiter =
      dossier.etudesOperations.filter(
        (operation) =>
          operation.statut ===
            StatutEtudeOperation.EN_REDACTION ||
          operation.statut ===
            StatutEtudeOperation.A_CORRIGER_REDACTEUR
      ).length;

    return {
      ...dossier,
      resume: {
        operationsTotal:
          dossier.etudesOperations.length,
        operationsATraiter,
      },
    };
  }


  /*
   * Enregistre un brouillon d'avis du Rédacteur sur
   * une opération, sans le transmettre au Vérificateur.
   *
   * Statuts autorisés :
   * - EN_REDACTION ;
   * - A_CORRIGER_REDACTEUR.
   */
  async enregistrerAvisRedacteur(
    etudeOperationId: string,
    data:
      EnregistrerAvisRedacteurDto,
    utilisateurId: string,
    role: string
  ) {
    this.assertRedacteur(
      role
    );

    const operation =
      await this
        .serviceEtudeRepository
        .findEtudeOperationRedacteurById(
          etudeOperationId,
          utilisateurId
        );

    if (!operation) {
      throw new AppError(
        "Opération d’étude introuvable ou non affectée à ce Rédacteur.",
        404
      );
    }

    const statutAutorise =
      operation.statut ===
        StatutEtudeOperation.EN_REDACTION ||
      operation.statut ===
        StatutEtudeOperation.A_CORRIGER_REDACTEUR;

    if (!statutAutorise) {
      throw new AppError(
        "Cette opération n’est pas actuellement modifiable par le Rédacteur.",
        409
      );
    }

    if (
      operation.avisFinalId
    ) {
      throw new AppError(
        "Cette opération possède déjà une décision finale et ne peut plus être modifiée.",
        409
      );
    }

    /*
     * La minute logique conserve son mode de préparation.
     * Une correction crée une nouvelle version du contenu,
     * mais ne transforme pas une minute MANUEL en MODELE
     * (ou inversement).
     */
    if (
      data.decision ===
        "INSCRIPTION" &&
      operation.minuteInscription
    ) {
      if (
        operation
          .minuteInscription
          .modePreparation !==
        data.minute
          .modePreparation
      ) {
        throw new AppError(
          "Le mode de préparation d’une minute existante ne peut pas être modifié.",
          409
        );
      }

      const referenceExistante =
        operation
          .minuteInscription
          .referenceModele ??
        undefined;

      if (
        referenceExistante !==
        data.minute
          .referenceModele
      ) {
        throw new AppError(
          "La référence du modèle d’une minute existante ne peut pas être modifiée.",
          409
        );
      }
    }

    try {
      const result =
        await this
          .serviceEtudeRepository
          .enregistrerAvisRedacteur({
            etudeOperationId,

            auteurId:
              utilisateurId,

            decision:
              data.decision ===
                "INSCRIPTION"
                ? DecisionAvisEtude.INSCRIPTION
                : DecisionAvisEtude.REFUS,

            observations:
              data.observations,

            ...(data.decision ===
              "REFUS"
              ? {
                  motifsRefus:
                    data.motifsRefus,
                }
              : {
                  minute: {
                    modePreparation:
                      data.minute
                        .modePreparation ===
                      "MODELE"
                        ? ModePreparationMinute.MODELE
                        : ModePreparationMinute.MANUEL,

                    referenceModele:
                      data.minute
                        .referenceModele,

                    contenu:
                      data.minute
                        .contenu,
                  },
                }),
          });

      return {
        etudeOperationId,
        statut:
          operation.statut,

        /*
         * Important : ce statut n'est pas changé ici.
         * L'avis est sauvegardé comme brouillon métier.
         */
        transmisAuVerificateur:
          false,

        ...result,
      };
    } catch (error) {
      /*
       * Protection complémentaire contre deux
       * sauvegardes concurrentes produisant le même
       * numéro d'avis ou de version.
       */
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "Une modification concurrente a été détectée. Veuillez réessayer.",
          409
        );
      }

      throw error;
    }
  }


  /*
   * Transmet au Vérificateur le dernier travail sauvegardé
   * par le Rédacteur.
   *
   * Aucune donnée de l'avis, de la minute ou des motifs de
   * refus n'est réécrite pendant cette action.
   */
  async transmettreOperationRedacteur(
    etudeOperationId: string,
    utilisateurId: string,
    role: string
  ) {
    this.assertRedacteur(
      role
    );

    const operation =
      await this
        .serviceEtudeRepository
        .findEtudeOperationRedacteurById(
          etudeOperationId,
          utilisateurId
        );

    if (!operation) {
      throw new AppError(
        "Opération d’étude introuvable ou non affectée à ce Rédacteur.",
        404
      );
    }

    const statutAutorise =
      operation.statut ===
        StatutEtudeOperation.EN_REDACTION ||
      operation.statut ===
        StatutEtudeOperation.A_CORRIGER_REDACTEUR;

    if (!statutAutorise) {
      throw new AppError(
        "Cette opération n’est pas actuellement transmissible par le Rédacteur.",
        409
      );
    }

    if (
      operation.avisFinalId
    ) {
      throw new AppError(
        "Cette opération possède déjà une décision finale et ne peut plus être transmise.",
        409
      );
    }

    const dernierAvis =
      operation.avis[0];

    if (!dernierAvis) {
      throw new AppError(
        "Un avis du Rédacteur doit être enregistré avant la transmission au Vérificateur.",
        409
      );
    }

    if (
      dernierAvis.decision ===
        DecisionAvisEtude.INSCRIPTION
    ) {
      if (
        !operation.minuteInscription ||
        operation.minuteInscription
          .versions.length === 0
      ) {
        throw new AppError(
          "Une minute d’inscription doit être enregistrée avant de transmettre un avis d’inscription.",
          409
        );
      }
    }

    if (
      dernierAvis.decision ===
        DecisionAvisEtude.REFUS &&
      dernierAvis.motifsRefus
        .length === 0
    ) {
      throw new AppError(
        "Au moins un motif de refus doit être enregistré avant la transmission au Vérificateur.",
        409
      );
    }

    const affectationVerificateur =
      operation.dossierEtude
        .affectations.find(
          (affectation) =>
            affectation.type ===
              "VERIFICATEUR" &&
            affectation.utilisateur
              .statut &&
            affectation.utilisateur
              .role.nom ===
              "VERIFICATEUR"
        );

    if (
      !affectationVerificateur
    ) {
      throw new AppError(
        "Aucun Vérificateur actif n’est actuellement affecté à ce dossier.",
        409
      );
    }

    const transmitted =
      await this
        .serviceEtudeRepository
        .transmettreOperationRedacteur(
          etudeOperationId,
          utilisateurId,
          operation.statut
        );

    if (!transmitted) {
      throw new AppError(
        "L’opération a été modifiée entre-temps. Actualisez le dossier avant de réessayer.",
        409
      );
    }

    return {
      ...transmitted,

      transmisAuVerificateur:
        true,

      verificateur:
        transmitted
          .dossierEtude
          .affectations[0]
          ?.utilisateur ??
        affectationVerificateur
          .utilisateur,
    };
  }


  private assertVerificateur(
    role: string
  ): void {
    if (
      role === "VERIFICATEUR"
    ) {
      return;
    }

    throw new AppError(
      "Vous n’êtes pas autorisé à accéder à l’espace du Vérificateur.",
      403
    );
  }

  /*
   * Liste des dossiers actuellement affectés au
   * Vérificateur connecté.
   *
   * Sont considérées comme opérations à traiter :
   * - EN_VERIFICATION ;
   * - A_CORRIGER_VERIFICATEUR.
   */
  async findDossiersVerificateur(
    query:
      ListDossiersVerificateurDto,
    utilisateurId: string,
    role: string
  ) {
    this.assertVerificateur(
      role
    );

    const result =
      await this
        .serviceEtudeRepository
        .findDossiersVerificateur(
          utilisateurId,
          query.page,
          query.limit,
          query.search
        );

    const dossiers =
      result.data.map(
        (dossier) => {
          const operationsATraiter =
            dossier.etudesOperations.filter(
              (operation) =>
                operation.statut ===
                  StatutEtudeOperation.EN_VERIFICATION ||
                operation.statut ===
                  StatutEtudeOperation.A_CORRIGER_VERIFICATEUR
            ).length;

          return {
            ...dossier,

            resume: {
              operationsTotal:
                dossier
                  .etudesOperations
                  .length,

              operationsATraiter,
            },
          };
        }
      );

    return {
      dossiers,

      meta: {
        total:
          result.total,

        page:
          result.page,

        limit:
          result.limit,

        totalPages:
          result.totalPages,
      },
    };
  }


  /*
   * Détail d'un dossier du Vérificateur connecté.
   *
   * Le repository applique également la contrainte
   * d'affectation active pour empêcher l'ouverture
   * du dossier d'un autre Vérificateur.
   */
  async findDossierVerificateurById(
    dossierId: string,
    utilisateurId: string,
    role: string
  ) {
    this.assertVerificateur(
      role
    );

    const dossier =
      await this
        .serviceEtudeRepository
        .findDossierVerificateurById(
          dossierId,
          utilisateurId
        );

    if (!dossier) {
      throw new AppError(
        "Dossier introuvable ou non affecté à ce Vérificateur.",
        404
      );
    }

    const operationsATraiter =
      dossier.etudesOperations.filter(
        (operation) =>
          operation.statut ===
            StatutEtudeOperation.EN_VERIFICATION ||
          operation.statut ===
            StatutEtudeOperation.A_CORRIGER_VERIFICATEUR
      ).length;

    return {
      ...dossier,

      resume: {
        operationsTotal:
          dossier
            .etudesOperations
            .length,

        operationsATraiter,
      },
    };
  }


  /*
   * Enregistre un avis du Vérificateur sans effectuer
   * encore l'action de sortie de son étape.
   *
   * Statuts autorisés :
   * - EN_VERIFICATION ;
   * - A_CORRIGER_VERIFICATEUR.
   *
   * La réponse calcule simplement si le dernier avis
   * du Rédacteur et le nouvel avis du Vérificateur sont
   * concordants ou divergents.
   */
  async enregistrerAvisVerificateur(
    etudeOperationId: string,
    data:
      EnregistrerAvisVerificateurDto,
    utilisateurId: string,
    role: string
  ) {
    this.assertVerificateur(
      role
    );

    const operation =
      await this
        .serviceEtudeRepository
        .findEtudeOperationVerificateurById(
          etudeOperationId,
          utilisateurId
        );

    if (!operation) {
      throw new AppError(
        "Opération d’étude introuvable ou non affectée à ce Vérificateur.",
        404
      );
    }

    const statutAutorise =
      operation.statut ===
        StatutEtudeOperation.EN_VERIFICATION ||
      operation.statut ===
        StatutEtudeOperation.A_CORRIGER_VERIFICATEUR;

    if (!statutAutorise) {
      throw new AppError(
        "Cette opération n’est pas actuellement modifiable par le Vérificateur.",
        409
      );
    }

    if (
      operation.avisFinalId
    ) {
      throw new AppError(
        "Cette opération possède déjà une décision finale et ne peut plus être modifiée.",
        409
      );
    }

    const avisRedacteur =
      operation.avis[0];

    if (!avisRedacteur) {
      throw new AppError(
        "Aucun avis du Rédacteur n’est disponible pour cette opération.",
        409
      );
    }

    /*
     * Une opération transmise avec INSCRIPTION doit
     * toujours disposer d'une minute du Rédacteur.
     * On la contrôle avant de permettre au Vérificateur
     * de prendre position.
     */
    if (
      avisRedacteur.decision ===
        DecisionAvisEtude.INSCRIPTION &&
      (
        !operation.minuteInscription ||
        operation.minuteInscription
          .versions.length === 0
      )
    ) {
      throw new AppError(
        "La minute du Rédacteur est absente pour cette opération d’inscription.",
        409
      );
    }

    const decision =
      data.decision ===
        "INSCRIPTION"
        ? DecisionAvisEtude.INSCRIPTION
        : DecisionAvisEtude.REFUS;

    try {
      const avis =
        await this
          .serviceEtudeRepository
          .enregistrerAvisVerificateur(
            etudeOperationId,
            utilisateurId,
            decision,
            data.observations,
            data.decision ===
              "REFUS"
              ? data.motifsRefus
              : undefined
          );

      const concordance =
        avisRedacteur.decision ===
        avis.decision;

      return {
        etudeOperationId,

        statut:
          operation.statut,

        avisRedacteur,

        avisVerificateur:
          avis,

        concordanceAvecRedacteur:
          concordance,

        /*
         * Sauvegarder l'avis ne déclenche encore ni
         * transmission au Super-vérificateur ni retour
         * au Rédacteur.
         */
        transmisAuSuperVerificateur:
          false,

        retourneAuRedacteur:
          false,
      };
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "Une modification concurrente a été détectée. Veuillez réessayer.",
          409
        );
      }

      throw error;
    }
  }


  /*
   * Transmet l'opération au Super-vérificateur lorsque
   * le dernier avis du Vérificateur concorde avec le
   * dernier avis du Rédacteur.
   *
   * Le cas de divergence est volontairement refusé ici :
   * il sera traité par les actions métier dédiées
   * (retour au Rédacteur ou maintien de la divergence).
   */
  async transmettreOperationVerificateurAuSuper(
    etudeOperationId: string,
    utilisateurId: string,
    role: string
  ) {
    this.assertVerificateur(
      role
    );

    const operation =
      await this
        .serviceEtudeRepository
        .findEtudeOperationVerificateurPourTransmission(
          etudeOperationId,
          utilisateurId
        );

    if (!operation) {
      throw new AppError(
        "Opération d’étude introuvable ou non affectée à ce Vérificateur.",
        404
      );
    }

    const statutAutorise =
      operation.statut ===
        StatutEtudeOperation.EN_VERIFICATION ||
      operation.statut ===
        StatutEtudeOperation.A_CORRIGER_VERIFICATEUR;

    if (!statutAutorise) {
      throw new AppError(
        "Cette opération n’est pas actuellement transmissible par le Vérificateur.",
        409
      );
    }

    if (
      operation.avisFinalId
    ) {
      throw new AppError(
        "Cette opération possède déjà une décision finale et ne peut plus être transmise.",
        409
      );
    }

    const avisRedacteur =
      operation.avis
        .filter(
          (avis) =>
            avis.niveau ===
            NiveauAvisEtude.REDACTEUR
        )
        .sort(
          (a, b) =>
            b.numeroAvis -
            a.numeroAvis
        )[0];

    const avisVerificateur =
      operation.avis
        .filter(
          (avis) =>
            avis.niveau ===
            NiveauAvisEtude.VERIFICATEUR
        )
        .sort(
          (a, b) =>
            b.numeroAvis -
            a.numeroAvis
        )[0];

    if (!avisRedacteur) {
      throw new AppError(
        "Aucun avis du Rédacteur n’est disponible pour cette opération.",
        409
      );
    }

    if (!avisVerificateur) {
      throw new AppError(
        "Un avis du Vérificateur doit être enregistré avant la transmission au Super-vérificateur.",
        409
      );
    }

    const concordance =
      avisRedacteur.decision ===
      avisVerificateur.decision;

    if (!concordance) {
      throw new AppError(
        "Les avis du Rédacteur et du Vérificateur divergent. Utilisez l’action de retour au Rédacteur ou l’action de maintien de la divergence.",
        409
      );
    }

    if (
      avisVerificateur.decision ===
        DecisionAvisEtude.INSCRIPTION &&
      (
        !operation.minuteInscription ||
        operation.minuteInscription
          .versions.length === 0
      )
    ) {
      throw new AppError(
        "La minute d’inscription est absente et l’opération ne peut pas être transmise au Super-vérificateur.",
        409
      );
    }

    if (
      avisVerificateur.decision ===
        DecisionAvisEtude.REFUS &&
      avisVerificateur
        .motifsRefus.length === 0
    ) {
      throw new AppError(
        "Au moins un motif de refus du Vérificateur est requis avant la transmission au Super-vérificateur.",
        409
      );
    }

    const affectationSuper =
      operation.dossierEtude
        .affectations.find(
          (affectation) =>
            affectation.type ===
              "SUPER_VERIFICATEUR" &&
            affectation.utilisateur
              .statut &&
            affectation.utilisateur
              .role.nom ===
              "SUPER_VERIFICATEUR"
        );

    if (!affectationSuper) {
      throw new AppError(
        "Aucun Super-vérificateur actif n’est actuellement affecté à ce dossier.",
        409
      );
    }

    const transmitted =
      await this
        .serviceEtudeRepository
        .transmettreOperationVerificateurAuSuper(
          etudeOperationId,
          utilisateurId,
          operation.statut
        );

    if (!transmitted) {
      throw new AppError(
        "L’opération a été modifiée entre-temps. Actualisez le dossier avant de réessayer.",
        409
      );
    }

    return {
      ...transmitted,

      avisRedacteur,
      avisVerificateur,

      concordanceAvecRedacteur:
        true,

      transmisAuSuperVerificateur:
        true,

      superVerificateur:
        transmitted
          .dossierEtude
          .affectations[0]
          ?.utilisateur ??
        affectationSuper
          .utilisateur,
    };
  }


  private assertSuperVerificateur(
    role: string
  ): void {
    if (
      role ===
      "SUPER_VERIFICATEUR"
    ) {
      return;
    }

    throw new AppError(
      "Vous n’êtes pas autorisé à accéder à l’espace du Super-vérificateur.",
      403
    );
  }

  /*
   * Liste des dossiers affectés au Super-vérificateur
   * actuellement connecté.
   *
   * Seules les opérations EN_SUPER_VERIFICATION sont
   * comptées comme opérations à traiter.
   */
  async findDossiersSuperVerificateur(
    query:
      ListDossiersSuperVerificateurDto,
    utilisateurId: string,
    role: string
  ) {
    this.assertSuperVerificateur(
      role
    );

    const result =
      await this
        .serviceEtudeRepository
        .findDossiersSuperVerificateur(
          utilisateurId,
          query.page,
          query.limit,
          query.search
        );

    const dossiers =
      result.data.map(
        (dossier) => {
          const operationsATraiter =
            dossier.etudesOperations.filter(
              (operation) =>
                operation.statut ===
                StatutEtudeOperation.EN_SUPER_VERIFICATION
            ).length;

          return {
            ...dossier,

            resume: {
              operationsTotal:
                dossier
                  .etudesOperations
                  .length,

              operationsATraiter,
            },
          };
        }
      );

    return {
      dossiers,

      meta: {
        total:
          result.total,

        page:
          result.page,

        limit:
          result.limit,

        totalPages:
          result.totalPages,
      },
    };
  }


  async findDossierSuperVerificateurById(
    dossierId: string,
    utilisateurId: string,
    role: string
  ) {
    this.assertSuperVerificateur(role);

    const dossier =
      await this.serviceEtudeRepository
        .findDossierSuperVerificateurById(
          dossierId,
          utilisateurId
        );

    if (!dossier) {
      throw new AppError(
        "Dossier introuvable ou non affecté à ce Super-vérificateur.",
        404
      );
    }

    const operationsATraiter =
      dossier.etudesOperations.filter(
        (operation) =>
          operation.statut ===
          StatutEtudeOperation.EN_SUPER_VERIFICATION
      ).length;

    return {
      ...dossier,
      resume: {
        operationsTotal: dossier.etudesOperations.length,
        operationsATraiter,
      },
    };
  }


  /*
   * Enregistre l'avis du Super-vérificateur sans
   * finaliser encore l'opération.
   *
   * Le Super-vérificateur peut confirmer les avis
   * précédents ou prendre une décision différente.
   */
  async enregistrerAvisSuperVerificateur(
    etudeOperationId: string,
    data:
      EnregistrerAvisSuperVerificateurDto,
    utilisateurId: string,
    role: string
  ) {
    this.assertSuperVerificateur(
      role
    );

    const operation =
      await this
        .serviceEtudeRepository
        .findEtudeOperationSuperVerificateurById(
          etudeOperationId,
          utilisateurId
        );

    if (!operation) {
      throw new AppError(
        "Opération d’étude introuvable ou non affectée à ce Super-vérificateur.",
        404
      );
    }

    if (
      operation.statut !==
      StatutEtudeOperation.EN_SUPER_VERIFICATION
    ) {
      throw new AppError(
        "Cette opération n’est pas actuellement modifiable par le Super-vérificateur.",
        409
      );
    }

    if (
      operation.avisFinalId
    ) {
      throw new AppError(
        "Cette opération possède déjà une décision finale et ne peut plus être modifiée.",
        409
      );
    }

    const avisRedacteur =
      operation.avis
        .filter(
          (avis) =>
            avis.niveau ===
            NiveauAvisEtude.REDACTEUR
        )
        .sort(
          (a, b) =>
            b.numeroAvis -
            a.numeroAvis
        )[0];

    const avisVerificateur =
      operation.avis
        .filter(
          (avis) =>
            avis.niveau ===
            NiveauAvisEtude.VERIFICATEUR
        )
        .sort(
          (a, b) =>
            b.numeroAvis -
            a.numeroAvis
        )[0];

    if (!avisRedacteur) {
      throw new AppError(
        "Aucun avis du Rédacteur n’est disponible pour cette opération.",
        409
      );
    }

    if (!avisVerificateur) {
      throw new AppError(
        "Aucun avis du Vérificateur n’est disponible pour cette opération.",
        409
      );
    }

    const decision =
      data.decision ===
        "INSCRIPTION"
        ? DecisionAvisEtude.INSCRIPTION
        : DecisionAvisEtude.REFUS;

    try {
      const avis =
        await this
          .serviceEtudeRepository
          .enregistrerAvisSuperVerificateur(
            etudeOperationId,
            utilisateurId,
            decision,
            data.observations,
            data.decision ===
              "REFUS"
              ? data.motifsRefus
              : undefined
          );

      return {
        etudeOperationId,

        statut:
          operation.statut,

        avisRedacteur,
        avisVerificateur,

        avisSuperVerificateur:
          avis,

        divergenceRedacteurVerificateur:
          avisRedacteur.decision !==
          avisVerificateur.decision,

        concordanceAvecRedacteur:
          avis.decision ===
          avisRedacteur.decision,

        concordanceAvecVerificateur:
          avis.decision ===
          avisVerificateur.decision,

        decisionFinalisee:
          false,

        retourneAuVerificateur:
          false,
      };
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "Une modification concurrente a été détectée. Veuillez réessayer.",
          409
        );
      }

      throw error;
    }
  }


  /*
   * Le Super-vérificateur peut modifier directement le texte
   * d'une minute d'inscription avant la décision définitive.
   *
   * La modification crée toujours une nouvelle VersionMinute.
   * Elle ne finalise ni la minute ni l'opération.
   */
  async modifierMinuteSuperVerificateur(
    etudeOperationId: string,
    data:
      ModifierMinuteSuperVerificateurDto,
    utilisateurId: string,
    role: string
  ) {
    this.assertSuperVerificateur(
      role
    );

    const operation =
      await this
        .serviceEtudeRepository
        .findMinuteSuperVerificateurByOperationId(
          etudeOperationId,
          utilisateurId
        );

    if (!operation) {
      throw new AppError(
        "Opération d’étude introuvable ou non affectée à ce Super-vérificateur.",
        404
      );
    }

    if (
      operation.statut !==
      StatutEtudeOperation.EN_SUPER_VERIFICATION
    ) {
      throw new AppError(
        "La minute n’est modifiable par le Super-vérificateur que pendant la super-vérification.",
        409
      );
    }

    if (
      operation.avisFinalId
    ) {
      throw new AppError(
        "Cette opération possède déjà une décision finale et sa minute ne peut plus être modifiée.",
        409
      );
    }

    const dernierAvisSuper =
      operation.avis[0];

    if (!dernierAvisSuper) {
      throw new AppError(
        "Un avis du Super-vérificateur doit être enregistré avant de modifier la minute.",
        409
      );
    }

    if (
      dernierAvisSuper.decision !==
      DecisionAvisEtude.INSCRIPTION
    ) {
      throw new AppError(
        "La minute ne peut être modifiée que si le dernier avis du Super-vérificateur est INSCRIPTION.",
        409
      );
    }

    if (
      !operation.minuteInscription
    ) {
      throw new AppError(
        "Aucune minute d’inscription n’existe pour cette opération.",
        409
      );
    }

    try {
      const version =
        await this
          .serviceEtudeRepository
          .modifierMinuteSuperVerificateur(
            operation
              .minuteInscription.id,
            utilisateurId,
            data.contenu
          );

      return {
        etudeOperationId,

        statut:
          operation.statut,

        avisSuperVerificateur:
          dernierAvisSuper,

        ancienneVersion:
          operation
            .minuteInscription
            .versions[0] ??
          null,

        nouvelleVersion:
          version,

        versionFinaleId:
          operation
            .minuteInscription
            .versionFinaleId,

        decisionFinalisee:
          false,
      };
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "Une modification concurrente de la minute a été détectée. Veuillez réessayer.",
          409
        );
      }

      throw error;
    }
  }

}
