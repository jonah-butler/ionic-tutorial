import { ref, onMounted, watch } from 'vue';
import { Camera, CameraPhoto, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Storage } from '@capacitor/storage';
import { isPlatform, getPlatforms } from '@ionic/vue';

export function usePhotoGallery() {

    const PHOTO_STORAGE = "photos";
    const photos = ref<UserPhoto[]>([]);

    const loadSaved = async () => {
        const photoList = await Storage.get({ key: PHOTO_STORAGE });
        const photosInStorage = photoList.value ? JSON.parse(photoList.value) : [];
      
        if(!isPlatform('hybrid')) {
            for (const photo of photosInStorage) {
                const file = await Filesystem.readFile({
                    path: photo.filepath,
                    directory: Directory.Data
                });
                photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
            }
        }
      
        photos.value = photosInStorage;
      }

    const cachePhotos = () => {
        Storage.set({
            key: PHOTO_STORAGE,
            value: JSON.stringify(photos.value)
        })
    }

    const convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            resolve(reader.result);
        }
        reader.readAsDataURL(blob);
    });

    const savePicture = async(photo: Photo, fileName: string) => {
        console.log(getPlatforms());
        let base64Data: string;

        if(isPlatform('hybrid')) {
            const file = await Filesystem.readFile({
                path: photo.path!
            })
            base64Data = file.data;
        } else {
            const response = await fetch(photo.webPath!);
            const blob = await response.blob();
            base64Data = await convertBlobToBase64(blob) as string;
        }

        const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Data,
        });
        
        if (isPlatform('hybrid')) {
            return {
              filepath: savedFile.uri,
              webviewPath: Capacitor.convertFileSrc(savedFile.uri),
            };
          }
          else {
            return {
              filepath: fileName,
              webviewPath: photo.webPath
            };
          }
    }

    const takePhoto = async () => {
        const cameraPhoto = await Camera.getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            quality: 100,
        });
        const fileName = `${new Date().getTime()}.jpeg`;
        const savedFileImage = {
            filepath: fileName,
            webviewPath: cameraPhoto.webPath,
        };
        await savePicture(cameraPhoto, fileName);
        photos.value = [savedFileImage, ...photos.value];
    };

    watch(photos, cachePhotos);
    onMounted(loadSaved);

    return {
        takePhoto,
        photos,
    };
}

export interface UserPhoto {
    filepath: string;
    webviewPath?: string;
}