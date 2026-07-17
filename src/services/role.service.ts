import { RoleRepository } from "../repositories/role.repository";

export class RoleService {

  constructor(
    private repository = new RoleRepository()
  ) {}

  async findAll() {

    return this.repository.findAll();

  }

}