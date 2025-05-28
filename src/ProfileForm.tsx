import { FormEvent, useEffect, useState, useRef } from "react";
    import { useMutation, useQuery, useAction } from "convex/react";
    import { api } from "../convex/_generated/api";
    import { toast } from "sonner";
    import { Id } from "../convex/_generated/dataModel";

    export function ProfileForm() {
      const myProfile = useQuery(api.profiles.getMyProfile);
      const updateProfileMutation = useMutation(api.profiles.updateMyProfile);
      const generateUploadUrl = useAction(api.files.actionGenerateUploadUrl);

      const [username, setUsername] = useState("");
      const [displayName, setDisplayName] = useState("");
      const [locationCity, setLocationCity] = useState("");
      const [locationRegion, setLocationRegion] = useState("");
      const [locationCountry, setLocationCountry] = useState("");
      const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "advanced" | "">("");
      const [bio, setBio] = useState("");
      const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
      const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
      const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
      const imageInputRef = useRef<HTMLInputElement>(null);


      const [isSubmitting, setIsSubmitting] = useState(false);

      useEffect(() => {
        if (myProfile) {
          setUsername(myProfile.username || "");
          setDisplayName(myProfile.displayName || "");
          setLocationCity(myProfile.locationCity || "");
          setLocationRegion(myProfile.locationRegion || "");
          setLocationCountry(myProfile.locationCountry || "");
          setExperienceLevel(myProfile.experienceLevel || "");
          setBio(myProfile.bio || "");
          setProfileImagePreview(myProfile.profileImageUrl || null);
          setProfileImageFile(null);
          setRemoveCurrentImage(false);
          if(imageInputRef.current) imageInputRef.current.value = "";
        }
      }, [myProfile]);

      const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          setProfileImageFile(file);
          setRemoveCurrentImage(false);
          const reader = new FileReader();
          reader.onloadend = () => {
            setProfileImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        } else {
            setProfileImageFile(null);
            setProfileImagePreview(myProfile?.profileImageUrl || null);
        }
      };

      const handleRemoveImage = () => {
        setProfileImageFile(null);
        setProfileImagePreview(null);
        setRemoveCurrentImage(true);
        if(imageInputRef.current) imageInputRef.current.value = "";
      };

      const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
          let profileImageIdToUpdate: Id<"_storage"> | undefined | null = myProfile?.profileImageId;

          if (removeCurrentImage) {
            profileImageIdToUpdate = null;
          } else if (profileImageFile) {
            const uploadUrl = await generateUploadUrl();
            const uploadResponse = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": profileImageFile.type },
              body: profileImageFile,
            });
            const uploadJson = await uploadResponse.json();
            if (!uploadResponse.ok) {
              throw new Error(`Profile image upload failed: ${JSON.stringify(uploadJson)}`);
            }
            profileImageIdToUpdate = uploadJson.storageId;
          }

          await updateProfileMutation({
            username: username || undefined,
            displayName: displayName || undefined,
            locationCity: locationCity || undefined,
            locationRegion: locationRegion || undefined,
            locationCountry: locationCountry || undefined,
            experienceLevel: experienceLevel || undefined,
            bio: bio || undefined,
            profileImageId: profileImageIdToUpdate === null ? undefined : profileImageIdToUpdate,
          });
          toast.success("Profile updated successfully!");
        } catch (error: any) {
          toast.error(`Failed to update profile: ${error.message || error.toString()}`);
        } finally {
          setIsSubmitting(false);
        }
      };

      if (myProfile === undefined) {
        return <div className="text-center p-4">Loading profile form...</div>;
      }

      return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 shadow-lg rounded-lg">
          <h2 className="text-2xl font-semibold text-primary text-center">
            {myProfile ? "Update Your Profile" : "Complete Your Profile"}
          </h2>

          <div>
            <label htmlFor="profile-username" className="block text-sm font-medium text-gray-700">Username*</label>
            <input id="profile-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="mt-1 input-base" placeholder="e.g., seeker_jane" />
            <p className="text-xs text-gray-500 mt-1">Unique, used for @mentions and profile URL.</p>
          </div>

          <div>
            <label htmlFor="profile-displayName" className="block text-sm font-medium text-gray-700">Display Name</label>
            <input id="profile-displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 input-base" placeholder="e.g., Jane D." />
             <p className="text-xs text-gray-500 mt-1">How your name will appear to others.</p>
          </div>

          <div>
            <label htmlFor="profileImage" className="block text-sm font-medium text-gray-700">Profile Picture</label>
            <input id="profileImage" type="file" accept="image/*" ref={imageInputRef} onChange={handleImageChange} className="mt-1 file-input" />
            {profileImagePreview && (
              <div className="mt-2 flex items-center gap-2">
                <img src={profileImagePreview} alt="Profile preview" className="w-20 h-20 rounded-full object-cover" />
                <button type="button" onClick={handleRemoveImage} className="text-red-500 hover:underline text-sm">Remove Image</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="profile-locationCity" className="block text-sm font-medium text-gray-700">City*</label>
              <input id="profile-locationCity" type="text" value={locationCity} onChange={(e) => setLocationCity(e.target.value)} required className="mt-1 input-base" />
            </div>
            <div>
              <label htmlFor="profile-locationRegion" className="block text-sm font-medium text-gray-700">State/Region*</label>
              <input id="profile-locationRegion" type="text" value={locationRegion} onChange={(e) => setLocationRegion(e.target.value)} required className="mt-1 input-base" />
            </div>
            <div>
              <label htmlFor="profile-locationCountry" className="block text-sm font-medium text-gray-700">Country*</label>
              <input id="profile-locationCountry" type="text" value={locationCountry} onChange={(e) => setLocationCountry(e.target.value)} required className="mt-1 input-base" />
            </div>
          </div>

          <div>
            <label htmlFor="profile-experienceLevel" className="block text-sm font-medium text-gray-700">Experience Level</label>
            <select id="profile-experienceLevel" value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value as any)} className="mt-1 input-base">
              <option value="">Select Level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label htmlFor="profile-bio" className="block text-sm font-medium text-gray-700">Bio</label>
            <textarea id="profile-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1 input-base" placeholder="Tell us a bit about yourself..."></textarea>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      );
    }
