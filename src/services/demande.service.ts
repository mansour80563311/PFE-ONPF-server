import { StatutDemande } from "@prisma/client";
import { DemandeRepository } from "../repositories/demande.repository";
import {
  CreateDemandeDto,
  UpdateDemandeDto,
  ListDemandesDto,
} from "../validations/demande.validation";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../errors/AppError";



export class DemandeService {
    private static readonly PREFIX = "DF";
    private demandeRepository = new DemandeRepository();
    private userRepository = new UserRepository();
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
  async create(data: CreateDemandeDto) {
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
    await this.findById(id);

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

  async updateStatus(
    id: string,
    statut: StatutDemande
) {
    await this.findById(id);

    return this.demandeRepository.update(id, {
        statut,
    });
}

  async delete(id: string) {
    await this.findById(id);

    return this.demandeRepository.delete(id);
  }
}