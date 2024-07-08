import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { IpfsResponse } from 'src/entities/ipfs-response.entity';

@Injectable()
export class Ipfs {
    constructor(private readonly httpService: HttpService) {}

    async uploadJson(data: object): Promise<IpfsResponse> {
        const requestURL =
            process.env.PINATA_IPFS_ENDPOINT + '/pinning/pinJSONToIPFS';
        const response = await lastValueFrom(
            this.httpService.post(requestURL, data, {
                headers: {
                    Authorization: 'Bearer ' + process.env.PINATA_JWT,
                },
            }),
        );
        if (response.status == HttpStatus.OK) {
            response.data['Hash'] = response.data['IpfsHash'];
            return response.data;
        } else {
            return null;
        }
    }

    async uploadJsonFile(file: Express.Multer.File): Promise<IpfsResponse> {
        const form = new FormData();
        form.append('file', file.buffer.toString());
        const requestURL =
            process.env.PINATA_IPFS_ENDPOINT + '/pinning/pinJSONToIPFS';
        const response = await lastValueFrom(
            this.httpService.post(
                requestURL,
                {
                    pinataContent: JSON.parse(file.buffer.toString()),
                    pinataMetadata: {
                        name: file.originalname,
                    },
                },
                {
                    headers: {
                        Authorization: 'Bearer ' + process.env.PINATA_JWT,
                    },
                },
            ),
        );
        if (response.status == HttpStatus.OK) {
            response.data['Hash'] = response.data['IpfsHash'];
            return response.data;
        } else {
            throw new BadRequestException();
        }
    }

    async getData(ipfsHash: string): Promise<object> {
        try {
            const requestURL = process.env.PINATA_IPFS_GATEWAY + ipfsHash;
            const response = await lastValueFrom(
                this.httpService.get(requestURL),
            );
            if (response.status == HttpStatus.OK) {
                return response.data;
            } else {
                return null;
            }
        } catch (err) {
            return undefined;
        }
    }
}
