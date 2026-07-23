import {
  StatutDemande,
  StatutDocument,
  TypeDocument,
} from "@prisma/client";
import { DemandeRepository } from "../repositories/demande.repository";
import {
  CreateDemandeServiceDto,
  UpdateDemandeDto,
  ListDemandesDto,
} from "../validations/demande.validation";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../errors/AppError";
import {
  DemandeDocumentRepository,
} from "../repositories/demande-document.repository";

export class DemandeService {
    private static readonly PREFIX = "DF";
    private demandeRepository = new DemandeRepository();
    private userRepository = new UserRepository();
    private documentRepository =
      new DemandeDocumentRepository();
    // Méthode privée pour générer un numéro unique pour chaque demande
    private async generateNumero(): Promise<string> {
    const lastDemande =
        await this.demandeRepository.findLastNumero();

    const year = new Date().getFullYear();

    if (!lastDemande) {
        return `${DemandeService.PREFIX}-${year}-000001`;
    }

    const parts = lastDemande.numero.split("-");

    const lastNumber = Number(parts[2]);

    if (Number.isNaN(lastNumber)) {
    throw new AppError(
        "Le numéro de demande est invalide.",
        500
    );
    }

    const nextNumber = String(lastNumber + 1).padStart(6, "0");

    return `${DemandeService.PREFIX}-${year}-${nextNumber}`;
    }
  async create(data: CreateDemandeServiceDto) {
    const utilisateur =
      await this.userRepository.findById(data.utilisateurId);

    if (!utilisateur) {
      throw new AppError("Utilisateur introuvable.", 404);
    }

    const existing =
        await this.demandeRepository.findByCinAndReference(
            data.cin,
            data.referenceFonciere
        );

        if (existing) {
        throw new AppError(
        "Une demande existe déjà pour ce demandeur et cette référence foncière.",
        409
        );
        }

    const numero = await this.generateNumero();

    return this.demandeRepository.create({
      numero,
      nomDemandeur: data.nomDemandeur,
      prenomDemandeur: data.prenomDemandeur,
      cin: data.cin,
      telephone: data.telephone,
      email: data.email || null,
      referenceFonciere: data.referenceFonciere,
      adresseBien: data.adresseBien,
      observations: data.observations || null,
      statut: StatutDemande.EN_ATTENTE,
      utilisateur: {
        connect: {
          id: data.utilisateurId,
        },
      },
    });
  }

  async findAll(query: ListDemandesDto) {
    const { page, limit, search } = query;

    const result = await this.demandeRepository.findAll(
        page,
        limit,
        search
    );

    return {
        demandes: result.data,
        meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        },
    };
    }

  async findById(id: string) {
    const demande = await this.demandeRepository.findById(id);

    if (!demande) {
      throw new AppError("Demande introuvable.", 404);
    }

    return demande;
  }

  async update(id: string, data: UpdateDemandeDto) {
    const demande = await this.findById(id);

    if (
        demande.statut === StatutDemande.VALIDEE ||
        demande.statut === StatutDemande.REJETEE
      ) {
      throw new AppError(
        "Une demande terminée ne peut plus être modifiée.",
        400
      );
    }

    return this.demandeRepository.update(id, {
      ...(data.nomDemandeur !== undefined  && {
        nomDemandeur: data.nomDemandeur,
      }),
      ...(data.prenomDemandeur !== undefined && {
        prenomDemandeur: data.prenomDemandeur,
      }),
      ...(data.cin !== undefined && {
        cin: data.cin,
      }),
      ...(data.telephone !== undefined && {
        telephone: data.telephone,
      }),
      ...(data.referenceFonciere !== undefined && {
        referenceFonciere: data.referenceFonciere,
      }),
      ...(data.adresseBien !== undefined && {
        adresseBien: data.adresseBien,
      }),
      ...(data.email !== undefined && {
        email: data.email || null,
      }),
      ...(data.observations !== undefined && {
        observations: data.observations || null,
      }),
    });
  }

  private async verifyDocumentsBeforeValidation(
    demandeId: string
  ): Promise<void> {
    const documents =
      await this.documentRepository
        .findForValidation(demandeId);

    const identityDocument = documents.find(
      (document) =>
        document.type === TypeDocument.CIN ||
        document.type === TypeDocument.PASSEPORT
    );

    const contrat = documents.find(
      (document) =>
        document.type === TypeDocument.CONTRAT
    );

    const procuration = documents.find(
      (document) =>
        document.type ===
        TypeDocument.PROCURATION
    );

    const piecesManquantes: string[] = [];
    const piecesNonConformes: string[] = [];

    if (!identityDocument) {
      piecesManquantes.push(
        "CIN ou passeport"
      );
    } else if (
      identityDocument.statut !==
      StatutDocument.CONFORME
    ) {
      piecesNonConformes.push(
        "CIN ou passeport"
      );
    }

    if (!contrat) {
      piecesManquantes.push("contrat");
    } else if (
      contrat.statut !== StatutDocument.CONFORME
    ) {
      piecesNonConformes.push("contrat");
    }

    if (!procuration) {
      piecesManquantes.push("procuration");
    } else if (
      procuration.statut !==
      StatutDocument.CONFORME
    ) {
      piecesNonConformes.push("procuration");
    }

    if (
      piecesManquantes.length > 0 ||
      piecesNonConformes.length > 0
    ) {
      const details: string[] = [];

      if (piecesManquantes.length > 0) {
        details.push(
          `Pièces manquantes : ${piecesManquantes.join(
            ", "
          )}.`
        );
      }

      if (piecesNonConformes.length > 0) {
        details.push(
          `Pièces non conformes ou non vérifiées : ${piecesNonConformes.join(
            ", "
          )}.`
        );
      }

      throw new AppError(
        `La demande ne peut pas être validée. ${details.join(
          " "
        )}`,
        400
      );
    }
  }

  async updateStatus(
    id: string,
    nouveauStatut: StatutDemande,
    utilisateurId: string,
    motifRejet?: string
    
  ) {
    const demande = await this.findById(id);

    const transitionsAutorisees: Record<
      StatutDemande,
      StatutDemande[]
    > = {
      [StatutDemande.EN_ATTENTE]: [
        StatutDemande.EN_COURS,
      ],

      [StatutDemande.EN_COURS]: [
        StatutDemande.VALIDEE,
        StatutDemande.REJETEE,
      ],

      [StatutDemande.VALIDEE]: [],

      [StatutDemande.REJETEE]: [],
    };

    const transitionAutorisee =
      transitionsAutorisees[demande.statut].includes(
        nouveauStatut
      );

    if (!transitionAutorisee) {
      throw new AppError(
        `Le passage du statut ${demande.statut} vers ${nouveauStatut} n'est pas autorisé.`,
        400
      );
    }

    if (
      nouveauStatut === StatutDemande.REJETEE &&
      !motifRejet?.trim()
    ) {
      throw new AppError(
        "Le motif de rejet est obligatoire.",
        400
      );
    }

    if (
      nouveauStatut ===
      StatutDemande.VALIDEE
    ) {
      await this.verifyDocumentsBeforeValidation(
        id
      );
    }

    return this.demandeRepository
      .updateStatusWithHistory({
        id,

        ancienStatut: demande.statut,

        nouveauStatut,

        utilisateurId,

        motifRejet:
          nouveauStatut ===
          StatutDemande.REJETEE
            ? motifRejet!.trim()
            : null,
      });
  }
  
  async delete(id: string) {
    const demande = await this.findById(id);

    if (
      demande.statut === StatutDemande.VALIDEE ||
      demande.statut === StatutDemande.REJETEE
    ) {
      throw new AppError(
        "Une demande terminée ne peut plus être supprimée.",
        400
      );
    }

    return this.demandeRepository.delete(id);
  }
  
   async findHistory(id: string) {
    await this.findById(id);

    return this.demandeRepository
      .findHistoryByDemandeId(id);
  }
}

