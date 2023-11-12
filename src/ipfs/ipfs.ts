import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
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
        const response = await lastValueFrom(
            this.httpService.post(requestURL, formData, {
                headers: {
                    Authorization: auth,
                },
            }),
        );
        if (response.status == HttpStatus.OK) {
            return response.data;
        } else {
            return null;
        }
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
        const response = await lastValueFrom(
            this.httpService.post(requestURL, formData, {
                headers: {
                    Authorization: auth,
                },
            }),
        );
        if (response.status == HttpStatus.OK) {
            return response.data;
        } else {
            return null;
        }
    }
}
