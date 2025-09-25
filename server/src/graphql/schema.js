const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar Date
  scalar JSON

  type TechPack {
    id: ID!
    name: String!
    category: String!
    status: TechPackStatus!
    dateCreated: Date!
    lastModified: Date!
    season: String!
    brand: String!
    designer: String!
    images: [String!]!
    metadata: JSON
    version: String!
    parentId: String
    isActive: Boolean!
    createdBy: String!
    updatedBy: String!
    bomItems: [BOMItem!]!
    measurements: [POMSpecification!]!
    constructionDetails: [ConstructionDetail!]!
    careInstructions: [CareInstruction!]!
    colorways: [Colorway!]!
    versions: [TechPackVersion!]!
    stats: TechPackStats
  }

  type BOMItem {
    id: ID!
    techpackId: ID!
    part: PartClassification!
    materialCode: String!
    placement: Placement!
    sizeSpec: String!
    quantity: Float!
    uom: UOM!
    supplier: String!
    comments: [String!]!
    images: [String!]!
    color: String
    weight: Float
    cost: Float
    leadTime: Int
    createdAt: Date!
    updatedAt: Date!
  }

  type POMSpecification {
    id: ID!
    techpackId: ID!
    pomCode: String!
    pomName: String!
    tolerances: Tolerance!
    measurements: JSON!
    howToMeasure: String!
    category: String!
    unit: String!
    gradeRules: [JSON!]!
    createdAt: Date!
    updatedAt: Date!
  }

  type Tolerance {
    minusTol: Float!
    plusTol: Float!
    unit: String!
  }

  type ConstructionDetail {
    id: ID!
    techpackId: ID!
    category: ConstructionCategory!
    name: String!
    description: String!
    specifications: [JSON!]!
    sequence: Int!
    qualityCheckpoints: [String!]!
    specialInstructions: [String!]!
    materials: [String!]!
    tools: [String!]!
    estimatedTime: Int!
    difficulty: Difficulty!
    diagram: String
    photos: [String!]!
    createdAt: Date!
    updatedAt: Date!
    createdBy: String!
    tags: [String!]!
  }

  type CareInstruction {
    id: ID!
    techpackId: ID!
    language: String!
    symbols: [String!]!
    textInstructions: [String!]!
    specialInstructions: [String!]!
    warnings: [String!]!
    createdAt: Date!
    updatedAt: Date!
  }

  type Colorway {
    id: ID!
    techpackId: ID!
    name: String!
    colors: [JSON!]!
    createdAt: Date!
    updatedAt: Date!
  }

  type TechPackVersion {
    id: ID!
    techpackId: ID!
    version: String!
    status: VersionStatus!
    changes: [JSON!]!
    approvals: [JSON!]!
    notes: String
    createdBy: String!
    createdAt: Date!
    updatedAt: Date!
    parentVersionId: String
    isActive: Boolean!
    refitRequestId: String
  }

  type TechPackStats {
    bomItemCount: Int!
    measurementCount: Int!
    constructionDetailCount: Int!
    careInstructionCount: Int!
    versionCount: Int!
  }

  type ValidationResult {
    isValid: Boolean!
    errors: [String!]!
    warnings: [String!]!
    completeness: Completeness!
    consistency: Consistency!
  }

  type Completeness {
    basic: Float!
    bom: Float!
    measurements: Float!
    construction: Float!
    care: Float!
    overall: Float!
  }

  type Consistency {
    isValid: Boolean!
    errors: [String!]!
    warnings: [String!]!
  }

  type StateResult {
    success: Boolean!
    data: JSON
    rollback: String
  }

  type PaginationInfo {
    page: Int!
    limit: Int!
    total: Int!
    totalPages: Int!
  }

  type TechPackListResponse {
    success: Boolean!
    data: [TechPack!]!
    pagination: PaginationInfo!
    stats: TechPackStats!
  }

  type TechPackResponse {
    success: Boolean!
    data: TechPack
    message: String
  }

  type ValidationResponse {
    success: Boolean!
    data: ValidationResult!
  }

  type StateResponse {
    success: Boolean!
    data: JSON
    message: String
  }

  # Enums
  enum TechPackStatus {
    draft
    review
    approved
    production
  }

  enum PartClassification {
    Fabric
    Trims
    Labels
    Packaging
  }

  enum Placement {
    Collar
    Placket
    Pocket
    Sleeve
    Body
    Cuff
    Hem
    Seam
    Buttonhole
    Zipper
    Other
  }

  enum UOM {
    Yards
    Meters
    Pieces
    Dozen
    Rolls
    Sheets
    Feet
    Inches
    Grams
    Kilograms
  }

  enum ConstructionCategory {
    Seams
    Pockets
    Collar
    Sleeves
    Closures
    Hems
    Pleats
    Darts
    Other
  }

  enum Difficulty {
    Easy
    Medium
    Hard
    Expert
  }

  enum VersionStatus {
    Draft
    Review
    Approved
    Active
    Rejected
    Archived
  }

  # Input Types
  input TechPackInput {
    name: String!
    category: String!
    status: TechPackStatus
    season: String!
    brand: String!
    designer: String!
    images: [String!]
    metadata: JSON
    version: String
    parentId: String
    bomItems: [BOMItemInput!]
    measurements: [POMSpecificationInput!]
    constructionDetails: [ConstructionDetailInput!]
    careInstructions: [CareInstructionInput!]
    colorways: [ColorwayInput!]
  }

  input BOMItemInput {
    part: PartClassification!
    materialCode: String!
    placement: Placement!
    sizeSpec: String!
    quantity: Float!
    uom: UOM!
    supplier: String!
    comments: [String!]
    images: [String!]
    color: String
    weight: Float
    cost: Float
    leadTime: Int
  }

  input POMSpecificationInput {
    pomCode: String!
    pomName: String!
    tolerances: ToleranceInput!
    measurements: JSON!
    howToMeasure: String!
    category: String!
    unit: String!
    gradeRules: [JSON!]
  }

  input ToleranceInput {
    minusTol: Float!
    plusTol: Float!
    unit: String!
  }

  input ConstructionDetailInput {
    category: ConstructionCategory!
    name: String!
    description: String!
    specifications: [JSON!]
    sequence: Int
    qualityCheckpoints: [String!]
    specialInstructions: [String!]
    materials: [String!]
    tools: [String!]
    estimatedTime: Int!
    difficulty: Difficulty!
    diagram: String
    photos: [String!]
    tags: [String!]
  }

  input CareInstructionInput {
    language: String!
    symbols: [String!]
    textInstructions: [String!]
    specialInstructions: [String!]
    warnings: [String!]
  }

  input ColorwayInput {
    name: String!
    colors: [JSON!]
  }

  input TechPackFilters {
    page: Int
    limit: Int
    status: TechPackStatus
    category: String
    brand: String
    season: String
    search: String
    sortBy: String
    sortOrder: String
  }

  input OptimisticUpdateInput {
    module: String!
    updateData: JSON!
    operation: String!
  }

  # Queries
  type Query {
    # TechPack queries
    techPacks(filters: TechPackFilters): TechPackListResponse!
    techPack(id: ID!): TechPackResponse!
    techPackStats: TechPackStats!
    techPackState(id: ID!): StateResponse!
    
    # Validation queries
    validateTechPack(id: ID!): ValidationResponse!
    validateBusinessRules(id: ID!, ruleType: String!): ValidationResponse!
    
    # State queries
    checkConsistency(id: ID!): StateResponse!
  }

  # Mutations
  type Mutation {
    # TechPack mutations
    createTechPack(input: TechPackInput!): TechPackResponse!
    updateTechPack(id: ID!, input: TechPackInput!): TechPackResponse!
    deleteTechPack(id: ID!): TechPackResponse!
    
    # State mutations
    updateTechPackState(id: ID!, updates: JSON!): StateResponse!
    performOptimisticUpdate(id: ID!, input: OptimisticUpdateInput!): StateResponse!
    
    # Validation mutations
    validateTechPackData(id: ID!): ValidationResponse!
  }

  # Subscriptions
  type Subscription {
    techPackUpdated(id: ID!): TechPack!
    techPackStateChanged(id: ID!): JSON!
    validationCompleted(id: ID!): ValidationResult!
  }
`;

module.exports = typeDefs;
