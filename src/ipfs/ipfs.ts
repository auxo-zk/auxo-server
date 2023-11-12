import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';
import { IpfsResponse } from 'src/interfaces/ipfs-response.interface';

@Injectable()
export class Ipfs {
    constructor(private readonly httpService: HttpService) {}

    async upload(data: object): Promise<IpfsResponse> {
        const formData = new FormData();
        formData.append('file', JSON.stringify(data));
        const requestURL = process.env.IPFS_API_ENDPOINT + '/add';
        const auth =
            'Basic ' +
            btoa(
                process.env.IPFS_API_KEY +
                    ':' +
                    process.env.IPFS_API_SECRET_KEY,
            );
        const responseData = await lastValueFrom(
            this.httpService
                .post(requestURL, formData, {
                    headers: {
                        Authorization: auth,
                    },
                })
                .pipe(map((response) => response.data)),
        );
        return responseData;
    }

    async uploadFile(file: Express.Multer.File): Promise<IpfsResponse> {
        const formData = new FormData();
        formData.append('file', file.buffer.toString());
        const requestURL = process.env.IPFS_API_ENDPOINT + '/add';
        const auth =
            'Basic ' +
            btoa(
                process.env.IPFS_API_KEY +
                    ':' +
                    process.env.IPFS_API_SECRET_KEY,
            );
        const responseData = await lastValueFrom(
            this.httpService
                .post(requestURL, formData, {
                    headers: {
                        Authorization: auth,
                    },
                })
                .pipe(map((response) => response.data)),
        );
        return responseData;
    }
}
