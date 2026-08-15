import PDFDocument from "pdfkit";

import {
  NatureDemande,
  StatutDemande,
} from "@prisma/client";

import { AppError } from "../errors/AppError";

import type {
  DemandeService,
} from "./demande.service";

import type {
  DemandeDocumentService,
} from "./demande-document.service";

type DemandeRecapitulatifData =
  Awaited<
    ReturnType<
      DemandeService["findById"]
    >
  >;

type DocumentsRecapitulatifData =
  Awaited<
    ReturnType<
      DemandeDocumentService["findAll"]
    >
  >;

export class RecapitulatifDemandeService {
  private static readonly BRAND_COLOR =
    "#0A4A46";

  private static readonly TEXT_COLOR =
    "#202124";

  private static readonly SECONDARY_COLOR =
    "#5F6368";

  private static readonly BORDER_COLOR =
    "#D5DDDC";

  private static readonly SOFT_BACKGROUND =
    "#F4F8F7";

  private formatMontant(
    value: {
      toString(): string;
    }
  ): string {
    const numericValue =
      Number(value.toString());

    if (
      Number.isNaN(
        numericValue
      )
    ) {
      return `${value.toString()} DT`;
    }

    return `${numericValue
      .toFixed(3)
      .replace(".", ",")} DT`;
  }

  private formatDate(
    value: Date
  ): string {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(value);
  }

  private formatNature(
    nature:
      | NatureDemande
      | null
  ): string {
    switch (nature) {
      case NatureDemande.INSCRIPTION:
        return "Inscription foncière";

      case NatureDemande.PRESTATION:
        return "Prestation";

      default:
        return "Ancien modèle";
    }
  }

  private formatLangue(
    langue: string
  ): string {
    switch (langue) {
      case "ARABE":
        return "Arabe";

      case "ANGLAIS":
        return "Anglais";

      case "FRANCAIS":
      default:
        return "Français";
    }
  }

  private formatDocumentType(
    type: string
  ): string {
    switch (type) {
      case "CIN":
        return "Carte d'identité nationale";

      case "PASSEPORT":
        return "Passeport";

      case "CONTRAT":
        return "Contrat";

      case "PROCURATION":
        return "Procuration";

      default:
        return type;
    }
  }

  private ensureSpace(
    document: PDFKit.PDFDocument,
    requiredHeight = 80
  ): void {
    const bottomLimit =
      document.page.height -
      document.page.margins.bottom;

    if (
      document.y +
        requiredHeight >
      bottomLimit
    ) {
      document.addPage();

      document
        .rect(
          0,
          0,
          document.page.width,
          8
        )
        .fill(
          RecapitulatifDemandeService
            .BRAND_COLOR
        );

      document.y =
        document.page.margins.top;
    }
  }

  private writeSectionTitle(
    document: PDFKit.PDFDocument,
    title: string
  ): void {
    this.ensureSpace(
      document,
      55
    );

    const leftMargin =
      document.page.margins.left;

    const rightLimit =
      document.page.width -
      document.page.margins.right;

    const contentWidth =
      rightLimit -
      leftMargin;

    /*
     * PDFKit conserve la dernière position X
     * utilisée. On réinitialise donc toujours
     * le curseur au début de la zone de contenu.
     */
    document.x =
      leftMargin;

    document.moveDown(0.55);

    document
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(
        RecapitulatifDemandeService
          .BRAND_COLOR
      )
      .text(
        title,
        leftMargin,
        document.y,
        {
          width:
            contentWidth,
        }
      );

    const lineY =
      document.y + 2;

    document
      .moveTo(
        leftMargin,
        lineY
      )
      .lineTo(
        rightLimit,
        lineY
      )
      .lineWidth(0.8)
      .strokeColor(
        RecapitulatifDemandeService
          .BORDER_COLOR
      )
      .stroke();

    document.y =
      lineY + 8;

    document.x =
      leftMargin;
  }

  private writeRow(
    document: PDFKit.PDFDocument,
    label: string,
    value: string
  ): void {
    const leftMargin =
      document.page.margins.left;

    const contentWidth =
      document.page.width -
      document.page.margins.left -
      document.page.margins.right;

    const labelWidth =
      155;

    const valueX =
      leftMargin +
      labelWidth;

    const valueWidth =
      contentWidth -
      labelWidth;

    document
      .font("Helvetica-Bold")
      .fontSize(9.5);

    const labelHeight =
      document.heightOfString(
        `${label} :`,
        {
          width:
            labelWidth - 8,
        }
      );

    document
      .font("Helvetica")
      .fontSize(9.5);

    const valueHeight =
      document.heightOfString(
        value,
        {
          width:
            valueWidth,
        }
      );

    const rowHeight =
      Math.max(
        labelHeight,
        valueHeight,
        12
      ) + 4;

    this.ensureSpace(
      document,
      rowHeight + 4
    );

    const y =
      document.y;

    document
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(
        RecapitulatifDemandeService
          .TEXT_COLOR
      )
      .text(
        `${label} :`,
        leftMargin,
        y,
        {
          width:
            labelWidth - 8,
        }
      );

    document
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor(
        RecapitulatifDemandeService
          .TEXT_COLOR
      )
      .text(
        value,
        valueX,
        y,
        {
          width:
            valueWidth,
        }
      );

    document.y =
      y + rowHeight;

    document.x =
      leftMargin;
  }

  private assertRequiredDocumentsPresent(
    documents:
      DocumentsRecapitulatifData
  ): void {
    const hasIdentityDocument =
      documents.some(
        (item) =>
          item.type === "CIN" ||
          item.type ===
            "PASSEPORT"
      );

    const hasContrat =
      documents.some(
        (item) =>
          item.type === "CONTRAT"
      );

    const hasProcuration =
      documents.some(
        (item) =>
          item.type ===
            "PROCURATION"
      );

    const missingDocuments:
      string[] = [];

    if (!hasIdentityDocument) {
      missingDocuments.push(
        "CIN ou passeport"
      );
    }

    if (!hasContrat) {
      missingDocuments.push(
        "contrat"
      );
    }

    if (!hasProcuration) {
      missingDocuments.push(
        "procuration"
      );
    }

    if (
      missingDocuments.length > 0
    ) {
      throw new AppError(
        `Le récapitulatif ne peut pas être généré car le dossier documentaire est incomplet. Pièce(s) manquante(s) : ${missingDocuments.join(
          ", "
        )}.`,
        400
      );
    }
  }

  private writeDemandeDetails(
    document: PDFKit.PDFDocument,
    demande:
      DemandeRecapitulatifData
  ): void {
    this.writeRow(
      document,
      "Nature",
      this.formatNature(
        demande.nature
      )
    );

    if (
      demande.nature ===
      NatureDemande.INSCRIPTION
    ) {
      if (
        demande.titreFoncier
      ) {
        this.writeRow(
          document,
          "Numéro du titre foncier",
          demande
            .titreFoncier
            .numero
        );

        this.writeRow(
          document,
          "Gouvernorat",
          demande
            .titreFoncier
            .gouvernorat
            .nom
        );
      }

      if (demande.adresseBien) {
        this.writeRow(
          document,
          "Adresse du bien",
          demande.adresseBien
        );
      }

      const operations =
        demande
          .operationsFoncieres
          .map(
            (item) =>
              item
                .typeOperationFonciere
                .libelle
          );

      this.writeRow(
        document,
        "Opération(s) foncière(s)",
        operations.length > 0
          ? operations.join(", ")
          : "Aucune opération"
      );

      return;
    }

    if (
      demande.nature ===
      NatureDemande.PRESTATION
    ) {
      if (
        demande.prestation
      ) {
        this.writeRow(
          document,
          "Prestation",
          demande
            .prestation
            .libelle
        );
      }

      const langue =
        demande
          .tarification
          ?.langue;

      if (langue) {
        this.writeRow(
          document,
          "Langue",
          this.formatLangue(
            langue
          )
        );
      }

      const nombrePages =
        demande
          .tarification
          ?.nombrePages ??
        demande.nombrePages;

      if (
        nombrePages !==
          null &&
        nombrePages !==
          undefined
      ) {
        this.writeRow(
          document,
          "Nombre de pages",
          String(
            nombrePages
          )
        );
      }

      if (
        demande.titreFoncier
      ) {
        this.writeRow(
          document,
          "Numéro du titre foncier",
          demande
            .titreFoncier
            .numero
        );

        this.writeRow(
          document,
          "Gouvernorat",
          demande
            .titreFoncier
            .gouvernorat
            .nom
        );
      }

      return;
    }

    this.writeRow(
      document,
      "Référence foncière",
      demande.referenceFonciere
    );

    this.writeRow(
      document,
      "Adresse du bien",
      demande.adresseBien
    );

    this.writeRow(
      document,
      "Nombre d'exemplaires",
      String(
        demande.nombreExemplaires
      )
    );

    this.writeRow(
      document,
      "Langue du certificat",
      this.formatLangue(
        demande.langueCertificat
      )
    );

    this.writeRow(
      document,
      "Traduction demandée",
      demande.traductionDemandee
        ? "Oui"
        : "Non"
    );
  }

  private writeDocuments(
    document: PDFKit.PDFDocument,
    documents:
      DocumentsRecapitulatifData
  ): void {
    const leftMargin =
      document.page.margins.left;

    const contentWidth =
      document.page.width -
      document.page.margins.left -
      document.page.margins.right;

    const orderByType:
      Record<string, number> = {
        CIN: 1,
        PASSEPORT: 1,
        CONTRAT: 2,
        PROCURATION: 3,
      };

    const sortedDocuments =
      [...documents].sort(
        (a, b) =>
          (orderByType[a.type] ?? 99) -
          (orderByType[b.type] ?? 99)
      );

    sortedDocuments.forEach(
      (
        item,
        index
      ) => {
        this.ensureSpace(
          document,
          26
        );

        document
          .font("Helvetica")
          .fontSize(9.5)
          .fillColor(
            RecapitulatifDemandeService
              .TEXT_COLOR
          )
          .text(
            `${index + 1}. ${this.formatDocumentType(
              item.type
            )}`,
            leftMargin,
            document.y,
            {
              width:
                contentWidth,
            }
          );

        document.moveDown(0.18);
        document.x =
          leftMargin;
      }
    );
  }

  private writeTarificationTable(
    document: PDFKit.PDFDocument,
    demande:
      DemandeRecapitulatifData
  ): void {
    const tarification =
      demande.tarification;

    if (!tarification) {
      return;
    }

    const left =
      document.page.margins.left;

    const contentWidth =
      document.page.width -
      document.page.margins.left -
      document.page.margins.right;

    const descriptionWidth =
      contentWidth - 190;

    const quantityWidth =
      40;

    const unitWidth =
      70;

    const totalWidth =
      80;

    const headerHeight =
      25;

    const drawHeader = () => {
      this.ensureSpace(
        document,
        headerHeight + 35
      );

      const y =
        document.y;

      document
        .rect(
          left,
          y,
          contentWidth,
          headerHeight
        )
        .fill(
          RecapitulatifDemandeService
            .SOFT_BACKGROUND
        );

      document
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor(
          RecapitulatifDemandeService
            .TEXT_COLOR
        );

      document.text(
        "Libellé",
        left + 6,
        y + 8,
        {
          width:
            descriptionWidth - 12,
        }
      );

      document.text(
        "Qté",
        left +
          descriptionWidth,
        y + 8,
        {
          width:
            quantityWidth,
          align: "center",
        }
      );

      document.text(
        "Unitaire",
        left +
          descriptionWidth +
          quantityWidth,
        y + 8,
        {
          width:
            unitWidth,
          align: "right",
        }
      );

      document.text(
        "Montant",
        left +
          descriptionWidth +
          quantityWidth +
          unitWidth,
        y + 8,
        {
          width:
            totalWidth - 6,
          align: "right",
        }
      );

      document
        .moveTo(
          left,
          y + headerHeight
        )
        .lineTo(
          left + contentWidth,
          y + headerHeight
        )
        .lineWidth(0.8)
        .strokeColor(
          RecapitulatifDemandeService
            .BORDER_COLOR
        )
        .stroke();

      document.y =
        y + headerHeight;
    };

    drawHeader();

    const lignes =
      [...tarification.lignes]
        .sort(
          (a, b) =>
            a.ordre -
            b.ordre
        );

    lignes.forEach(
      (ligne) => {
        const labelHeight =
          document.heightOfString(
            ligne.libelle,
            {
              width:
                descriptionWidth - 12,
            }
          );

        const rowHeight =
          Math.max(
            26,
            labelHeight + 12
          );

        const bottomLimit =
          document.page.height -
          document.page.margins.bottom;

        if (
          document.y +
            rowHeight >
          bottomLimit
        ) {
          document.addPage();

          document
            .rect(
              0,
              0,
              document.page.width,
              8
            )
            .fill(
              RecapitulatifDemandeService
                .BRAND_COLOR
            );

          document.y =
            document.page
              .margins.top;

          this.writeSectionTitle(
            document,
            "Détail de la tarification (suite)"
          );

          drawHeader();
        }

        const y =
          document.y;

        document
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(
            RecapitulatifDemandeService
              .TEXT_COLOR
          )
          .text(
            ligne.libelle,
            left + 6,
            y + 7,
            {
              width:
                descriptionWidth - 12,
            }
          );

        document.text(
          String(
            ligne.quantite
          ),
          left +
            descriptionWidth,
          y + 7,
          {
            width:
              quantityWidth,
            align: "center",
          }
        );

        document.text(
          this.formatMontant(
            ligne
              .montantUnitaire
          ),
          left +
            descriptionWidth +
            quantityWidth,
          y + 7,
          {
            width:
              unitWidth,
            align: "right",
          }
        );

        document
          .font("Helvetica-Bold")
          .text(
            this.formatMontant(
              ligne.montant
            ),
            left +
              descriptionWidth +
              quantityWidth +
              unitWidth,
            y + 7,
            {
              width:
                totalWidth - 6,
              align: "right",
            }
          );

        document
          .moveTo(
            left,
            y + rowHeight
          )
          .lineTo(
            left +
              contentWidth,
            y + rowHeight
          )
          .lineWidth(0.5)
          .strokeColor(
            RecapitulatifDemandeService
              .BORDER_COLOR
          )
          .stroke();

        document.y =
          y + rowHeight;
      }
    );

    document.moveDown(0.5);

    const totalY =
      document.y;

    document
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(
        RecapitulatifDemandeService
          .BRAND_COLOR
      )
      .text(
        "TOTAL À PAYER",
        left,
        totalY,
        {
          width:
            contentWidth -
            totalWidth -
            10,
          align: "right",
        }
      );

    document.text(
      this.formatMontant(
        tarification
          .montantTotal
      ),
      left +
        contentWidth -
        totalWidth,
      totalY,
      {
        width:
          totalWidth,
        align: "right",
      }
    );

    document.y =
      totalY + 25;

    document.x =
      left;

    if (
      tarification
        .referenceReglementaire
    ) {
      this.writeRow(
        document,
        "Référence réglementaire",
        tarification
          .referenceReglementaire
      );
    }
  }

  private writeLegacyTarification(
    document: PDFKit.PDFDocument,
    demande:
      DemandeRecapitulatifData
  ): void {
    this.writeRow(
      document,
      "Prix unitaire",
      this.formatMontant(
        demande.prixUnitaire
      )
    );

    this.writeRow(
      document,
      "Supplément de traduction",
      this.formatMontant(
        demande
          .supplementTraduction
      )
    );

    this.writeRow(
      document,
      "Total à payer",
      this.formatMontant(
        demande.montantTotal
      )
    );
  }

  private writeSignatures(
    document: PDFKit.PDFDocument,
    demande:
      DemandeRecapitulatifData
  ): void {
    this.ensureSpace(
      document,
      155
    );

    document
      .font("Helvetica")
      .fontSize(9)
      .fillColor(
        RecapitulatifDemandeService
          .TEXT_COLOR
      )
      .text(
        "Je certifie avoir vérifié les informations figurant sur la présente demande avant son passage à la caisse.",
        {
          align: "justify",
        }
      );

    document.moveDown(1.2);

    const left =
      document.page.margins.left;

    const contentWidth =
      document.page.width -
      document.page.margins.left -
      document.page.margins.right;

    const gap = 24;

    const boxWidth =
      (
        contentWidth -
        gap
      ) / 2;

    const y =
      document.y;

    document
      .roundedRect(
        left,
        y,
        boxWidth,
        82,
        5
      )
      .lineWidth(0.8)
      .strokeColor(
        RecapitulatifDemandeService
          .BORDER_COLOR
      )
      .stroke();

    document
      .roundedRect(
        left +
          boxWidth +
          gap,
        y,
        boxWidth,
        82,
        5
      )
      .lineWidth(0.8)
      .strokeColor(
        RecapitulatifDemandeService
          .BORDER_COLOR
      )
      .stroke();

    document
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(
        RecapitulatifDemandeService
          .TEXT_COLOR
      )
      .text(
        "Signature du demandeur",
        left + 10,
        y + 10,
        {
          width:
            boxWidth - 20,
          align: "center",
        }
      );

    document.text(
      "Agent guichet",
      left +
        boxWidth +
        gap +
        10,
      y + 10,
      {
        width:
          boxWidth - 20,
        align: "center",
      }
    );

    document
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(
        RecapitulatifDemandeService
          .SECONDARY_COLOR
      )
      .text(
        `${demande.utilisateur.prenom} ${demande.utilisateur.nom}`,
        left +
          boxWidth +
          gap +
          10,
        y + 31,
        {
          width:
            boxWidth - 20,
          align: "center",
        }
      );

    document.y =
      y + 98;
  }

  private render(
    document: PDFKit.PDFDocument,
    demande:
      DemandeRecapitulatifData,
    documents:
      DocumentsRecapitulatifData
  ): void {
    const leftMargin =
      document.page.margins.left;

    const contentWidth =
      document.page.width -
      document.page.margins.left -
      document.page.margins.right;

    document
      .rect(
        0,
        0,
        document.page.width,
        10
      )
      .fill(
        RecapitulatifDemandeService
          .BRAND_COLOR
      );

    document
      .fillColor(
        RecapitulatifDemandeService
          .BRAND_COLOR
      )
      .font("Helvetica-Bold")
      .fontSize(15)
      .text(
        "OFFICE NATIONAL DE LA PROPRIÉTÉ FONCIÈRE",
        {
          align: "center",
        }
      );

    document.moveDown(0.25);

    document
      .fillColor(
        RecapitulatifDemandeService
          .SECONDARY_COLOR
      )
      .font("Helvetica")
      .fontSize(9)
      .text(
        "Système d'automatisation des inscriptions foncières",
        {
          align: "center",
        }
      );

    document.moveDown(0.9);

    document
      .fillColor(
        RecapitulatifDemandeService
          .TEXT_COLOR
      )
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(
        "DEMANDE DE SERVICE",
        {
          align: "center",
        }
      );

    document.moveDown(0.2);

    document
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor(
        RecapitulatifDemandeService
          .SECONDARY_COLOR
      )
      .text(
        "Récapitulatif à vérifier et signer avant le passage à la caisse",
        {
          align: "center",
        }
      );

    document.moveDown(1);

    const boxY =
      document.y;

    document
      .roundedRect(
        leftMargin,
        boxY,
        contentWidth,
        62,
        6
      )
      .lineWidth(1)
      .strokeColor(
        RecapitulatifDemandeService
          .BORDER_COLOR
      )
      .stroke();

    document
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(
        RecapitulatifDemandeService
          .SECONDARY_COLOR
      )
      .text(
        "N° de demande",
        leftMargin + 14,
        boxY + 11
      );

    document
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(
        RecapitulatifDemandeService
          .BRAND_COLOR
      )
      .text(
        demande.numero,
        leftMargin + 14,
        boxY + 28
      );

    document
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(
        RecapitulatifDemandeService
          .SECONDARY_COLOR
      )
      .text(
        "Date de création",
        leftMargin +
          contentWidth -
          175,
        boxY + 11,
        {
          width: 160,
          align: "right",
        }
      );

    document
      .font("Helvetica")
      .fontSize(10)
      .fillColor(
        RecapitulatifDemandeService
          .TEXT_COLOR
      )
      .text(
        this.formatDate(
          demande.createdAt
        ),
        leftMargin +
          contentWidth -
          175,
        boxY + 30,
        {
          width: 160,
          align: "right",
        }
      );

    document.y =
      boxY + 72;

    this.writeSectionTitle(
      document,
      "Informations du demandeur"
    );

    this.writeRow(
      document,
      "Nom et prénom",
      `${demande.prenomDemandeur} ${demande.nomDemandeur}`
    );

    this.writeRow(
      document,
      "CIN",
      demande.cin
    );

    if (
      demande
        .dateNaissanceDemandeur
    ) {
      this.writeRow(
        document,
        "Date de naissance",
        this.formatDate(
          demande
            .dateNaissanceDemandeur
        )
      );
    }

    if (
      demande.adresseDemandeur
    ) {
      this.writeRow(
        document,
        "Adresse",
        demande
          .adresseDemandeur
      );
    }

    this.writeRow(
      document,
      "Téléphone",
      demande.telephone
    );

    if (demande.email) {
      this.writeRow(
        document,
        "E-mail",
        demande.email
      );
    }

    this.writeSectionTitle(
      document,
      "Informations de la demande"
    );

    this.writeDemandeDetails(
      document,
      demande
    );

    this.writeSectionTitle(
      document,
      "Pièces justificatives déposées"
    );

    this.writeDocuments(
      document,
      documents
    );

    this.writeSectionTitle(
      document,
      "Détail de la tarification"
    );

    if (
      demande.nature !== null &&
      demande.tarification
    ) {
      this.writeTarificationTable(
        document,
        demande
      );
    } else {
      this.writeLegacyTarification(
        document,
        demande
      );
    }

    if (
      demande.observations
    ) {
      this.writeSectionTitle(
        document,
        "Observations"
      );

      document
        .font("Helvetica")
        .fontSize(9.5)
        .fillColor(
          RecapitulatifDemandeService
            .TEXT_COLOR
        )
        .text(
          demande.observations,
          {
            align: "justify",
          }
        );
    }

    this.ensureSpace(
      document,
      205
    );

    this.writeSectionTitle(
      document,
      "Vérification avant paiement"
    );

    this.writeSignatures(
      document,
      demande
    );

    this.ensureSpace(
      document,
      45
    );

    document
      .font("Helvetica")
      .fontSize(8)
      .fillColor(
        RecapitulatifDemandeService
          .SECONDARY_COLOR
      )
      .text(
        "Document récapitulatif généré automatiquement avant encaissement. Il ne constitue pas un reçu de paiement.",
        {
          align: "center",
        }
      );
  }

  async generate(
    demande:
      DemandeRecapitulatifData,
    documents:
      DocumentsRecapitulatifData
  ): Promise<Buffer> {
    if (
      demande.statut !==
      StatutDemande.EN_ATTENTE
    ) {
      throw new AppError(
        "Le récapitulatif avant paiement est disponible uniquement tant que la demande est encore au niveau du guichet.",
        400
      );
    }

    this
      .assertRequiredDocumentsPresent(
        documents
      );

    return new Promise<Buffer>(
      (
        resolve,
        reject
      ) => {
        const chunks:
          Buffer[] = [];

        const document =
          new PDFDocument({
            size: "A4",

            margins: {
              top: 35,
              right: 46,
              bottom: 35,
              left: 46,
            },

            info: {
              Title:
                `Demande de service ${demande.numero}`,

              Author:
                "Office National de la Propriété Foncière",

              Subject:
                `Récapitulatif avant paiement de la demande ${demande.numero}`,
            },
          });

        document.on(
          "data",
          (
            chunk:
              Uint8Array
          ) => {
            chunks.push(
              Buffer.from(
                chunk
              )
            );
          }
        );

        document.on(
          "end",
          () => {
            resolve(
              Buffer.concat(
                chunks
              )
            );
          }
        );

        document.on(
          "error",
          (
            error:
              Error
          ) => {
            reject(error);
          }
        );

        try {
          this.render(
            document,
            demande,
            documents
          );

          document.end();
        } catch (error) {
          reject(error);
        }
      }
    );
  }
}
