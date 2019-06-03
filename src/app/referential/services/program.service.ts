import {Injectable} from "@angular/core";
import gql from "graphql-tag";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {IWithProgramEntity, PmfmStrategy, Program} from "./model";
import {AccountService, BaseDataService, LoadResult, ReferentialRef, TableDataService} from "../../core/core.module";
import {ErrorCodes} from "./errors";
import {ReferentialFragments} from "../services/referential.queries";
import {GraphqlService} from "../../core/services/graphql.service";

export declare class ProgramFilter {
  searchText?: string;
  withProperty?: string;
  //acquisitionLevel?: string;
}

const LoadQuery: any = gql`
query Program($id: Int, $label: String){
    program(id: $id, label: $label){
      id
      label
      name
      description
      comments
      updateDate
      creationDate
      statusId
      properties
    }
}
`;

const LoadAllQuery: any = gql`
  query Programs($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ProgramFilterVOInput){
    programs(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      id
      label
      name
      description
      comments
      updateDate
      creationDate
      statusId
      properties
    }
    referentialsCount(entityName: "Program")
}
`;

const LoadProgramPmfms: any = gql`
  query LoadProgramPmfms($program: String) {
    programPmfms(program: $program){
      id
      pmfmId
      methodId
      label
      name
      unit
      type
      minValue
      maxValue
      maximumNumberDecimals
      defaultValue
      acquisitionNumber
      isMandatory
      rankOrder    
      acquisitionLevel
      updateDate
      gears
      taxonGroupIds
      referenceTaxonIds
      qualitativeValues {
        id
        label
        name
        statusId
        entityName
        __typename
      }
      __typename
    }
  }
`;

const LoadProgramGears: any = gql`
  query LoadProgramGears($program: String) {
    programGears(program: $program){
      ...ReferentialFragment
    }
  }
  ${ReferentialFragments.referential}
`;

@Injectable()
export class ProgramService extends BaseDataService implements TableDataService<Program, ProgramFilter> {

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService
  ) {
    super(graphql);

    // -- For DEV only
    //this._debug = !environment.production;
  }

  /**
   * Load programs
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param filter
   */
  watchAll(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: string,
           filter?: ProgramFilter,
           options?: any): Observable<LoadResult<Program>> {

    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'label',
      sortDirection: sortDirection || 'asc',
      filter: filter
    };
    const now = Date.now();
    if (this._debug) console.debug("[program-service] Loading programs using options:", variables);

    return this.graphql.watchQuery<{ programs: any[], referentialsCount: number }>({
      query: LoadAllQuery,
      variables: variables,
      error: {code: ErrorCodes.LOAD_PROGRAMS_ERROR, message: "PROGRAM.ERROR.LOAD_PROGRAMS_ERROR"}
    })
      .pipe(
        map(({programs, referentialsCount}) => {
            const data = (programs || []).map(Program.fromObject);
            if (this._debug) console.debug(`[program-service] Programs loaded in ${Date.now() - now}ms`, data);
            return {
              data: data,
              total: referentialsCount
            };
          }
        )
      );
  }

  async saveAll(data: Program[], options?: any): Promise<Program[]> {
    throw new Error("Not implemented yet");
  }

  deleteAll(data: Program[], options?: any): Promise<any> {
    throw new Error("Not implemented yet");
  }

  watchByLabel(label: string): Observable<Program> {
    return this.graphql.watchQuery<{ program: any }>({
      query: LoadQuery,
      variables: {
        label: label
      },
      error: {code: ErrorCodes.LOAD_PROGRAM_ERROR, message: "PROGRAM.ERROR.LOAD_PROGRAM_ERROR"}
    })
      .pipe(
        map(({program}) => Program.fromObject(program))
      );
  }

  async loadByLabel(label: string): Promise<Program> {
    const res = await this.graphql.query<{ program: any }>({
      query: LoadQuery,
      variables: {
        label: label
      },
      error: {code: ErrorCodes.LOAD_PROGRAM_ERROR, message: "PROGRAM.ERROR.LOAD_PROGRAM_ERROR"}
    });

    return res && res.program && Program.fromObject(res.program);

  }

  /**
   * Load program pmfms
   */
  async loadProgramPmfms(program: string, options?: {
    acquisitionLevel: string;
    gear?: string;
    taxonGroupId?: number;
    referenceTaxonId?: number;
    debug?: boolean;
  }): Promise<PmfmStrategy[]> {

    // TODO: add a cache ?

    if (this._debug) console.debug(`[referential-service] Getting pmfms (program=${program}, acquisitionLevel=${options && options.acquisitionLevel}, gear=${options && options.gear})`);
    const data = await this.graphql.query<{ programPmfms: PmfmStrategy[] }>({
      query: LoadProgramPmfms,
      variables: {
        program: program
      },
      error: {code: ErrorCodes.LOAD_PROGRAM_PMFMS_ERROR, message: "REFERENTIAL.ERROR.LOAD_PROGRAM_PMFMS_ERROR"},
      fetchPolicy: "cache-first"
    });
    const pmfmIds = []; // used to avoid duplicated pmfms

    // For DEBUG ONLY
    if (options.debug) console.debug(`[program-service] PMFM for ${options.acquisitionLevel} (not filtered):`, data && data.programPmfms);

    const res = (data && data.programPmfms || [])
    // Filter on acquisition level and gear
      .filter(p =>
        pmfmIds.indexOf(p.pmfmId) === -1
        && (
          !options || (
            (!options.acquisitionLevel || p.acquisitionLevel === options.acquisitionLevel)
            // Filter on gear (if PMFM has gears = compatible with all gears)
            && (!options.gear || !p.gears || !p.gears.length || p.gears.findIndex(g => g === options.gear) !== -1)
            // Filter on taxon group
            && (!options.taxonGroupId || !p.taxonGroupIds || !p.taxonGroupIds.length || p.taxonGroupIds.findIndex(g => g === options.taxonGroupId) !== -1)
            // Filter on reference taxon
            && (!options.referenceTaxonId || !p.referenceTaxonIds || !p.referenceTaxonIds.length || p.referenceTaxonIds.findIndex(g => g === options.referenceTaxonId) !== -1)
            // Add to list of IDs
            && pmfmIds.push(p.pmfmId)
          )
        ))
      // Convert into model
      .map(PmfmStrategy.fromObject);
    // Sort on rank order
    res.sort((p1, p2) => p1.rankOrder - p2.rankOrder);

    // For DEBUG only
    if (options.debug) console.debug(`[program-service] PMFM for ${options.acquisitionLevel} (filtered):`, res);

    return res;
    // TODO: translate name/label using translate service ?
  }

  /**
   * Load program gears
   */
  async loadGears(program: string): Promise<ReferentialRef[]> {
    if (this._debug) console.debug(`[referential-service] Getting gears for program ${program}`);
    const data = await this.graphql.query<{ programGears: ReferentialRef[] }>({
      query: LoadProgramGears,
      variables: {
        program: program
      },
      error: {code: ErrorCodes.LOAD_PROGRAM_GEARS_ERROR, message: "REFERENTIAL.ERROR.LOAD_PROGRAM_GEARS_ERROR"}
    });
    return (data && data.programGears || []).map(ReferentialRef.fromObject);
  }

  canUserWrite(data: IWithProgramEntity<any>): boolean {
    if (!data) return false;

    // If the user is the recorder: can write
    if (data.recorderPerson && this.accountService.isLogin() && this.accountService.account.equals(data.recorderPerson)) {
      return true;
    }

    // TODO: check rights on program (need model changes)

    // Check same department
    return this.accountService.canUserWriteDataForDepartment(data.recorderDepartment);
  }
}
